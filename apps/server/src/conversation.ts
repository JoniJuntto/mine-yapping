type Turn = { player: string; mob: string };

const histories = new Map<string, Turn[]>();
const entityVoices = new Map<string, string>();
let availableVoices: Promise<string[]> | undefined;

const RESPONSE_SCHEMA = {
	type: "object",
	properties: {
		reply: { type: "string" },
	},
	required: ["reply"],
	additionalProperties: false,
} as const;

export type MobReply = {
	transcript: string;
	reply: string;
	audio: string;
};

type MobContext = {
	entityId: string;
	entityType: string;
	entityName: string;
	playerName: string;
	dimension: string;
	health: string;
};

const openAI = async (path: string, apiKey: string, init: RequestInit) => {
	const response = await fetch(`https://api.openai.com/v1${path}`, {
		...init,
		headers: { Authorization: `Bearer ${apiKey}`, ...init.headers },
	});
	if (!response.ok) {
		throw new Error(
			`OpenAI ${response.status}: ${(await response.text()).slice(0, 300)}`,
		);
	}
	return response;
};

const elevenLabs = async (path: string, apiKey: string, init?: RequestInit) => {
	const response = await fetch(`https://api.elevenlabs.io${path}`, {
		...init,
		headers: { "xi-api-key": apiKey, ...init?.headers },
	});
	if (!response.ok) {
		throw new Error(
			`ElevenLabs ${response.status}: ${(await response.text()).slice(0, 300)}`,
		);
	}
	return response;
};

const getAvailableVoices = (apiKey: string) => {
	availableVoices ??= elevenLabs(
		"/v2/voices?page_size=100&include_total_count=false",
		apiKey,
	)
		.then(async (response) => {
			const { voices } = (await response.json()) as {
				voices?: Array<{ voice_id?: string }>;
			};
			const ids = voices?.flatMap(({ voice_id }) =>
				voice_id ? [voice_id] : [],
			);
			if (!ids?.length) throw new Error("ElevenLabs returned no voices");
			return ids;
		})
		.catch((cause) => {
			availableVoices = undefined;
			throw cause;
		});
	return availableVoices;
};

export const voiceFor = (entityId: string, voiceIds: string[]) => {
	const remembered = entityVoices.get(entityId);
	if (remembered) return remembered;
	const voice = voiceIds[Math.floor(Math.random() * voiceIds.length)];
	if (!voice) throw new Error("ElevenLabs returned no voices");
	entityVoices.set(entityId, voice);
	if (entityVoices.size > 1_000)
		entityVoices.delete(entityVoices.keys().next().value as string);
	return voice;
};

export const extractResponseText = (response: unknown): string => {
	if (!response || typeof response !== "object" || !("output" in response)) {
		throw new Error("OpenAI returned no output");
	}
	const output = (
		response as {
			output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
		}
	).output;
	const text = output
		?.flatMap((item) => item.content ?? [])
		.find((item) => item.type === "output_text")?.text;
	if (!text) throw new Error("OpenAI returned no text");
	return text;
};

export async function converse(
	input: File | string,
	context: MobContext,
	openAiApiKey: string,
	elevenLabsApiKey: string,
): Promise<MobReply> {
	const transcript = await transcribe(input, openAiApiKey);
	if (!transcript) throw new Error("No speech was detected");

	const history = histories.get(context.entityId) ?? [];
	const response = await (
		await openAI("/responses", openAiApiKey, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: "gpt-5.6-luna",
				instructions: [
					`You are ${context.entityName}, a Minecraft ${context.entityType}.`,
					"Reply in character in at most two short sentences.",
					"Use the entity type to infer a distinct personality and speech style.",
				].join(" "),
				input: [
					...history.flatMap((turn) => [
						{ role: "user", content: turn.player },
						{ role: "assistant", content: turn.mob },
					]),
					{
						role: "user",
						content: `Player ${context.playerName} says: ${transcript}\nWorld: ${context.dimension}; mob health: ${context.health}`,
					},
				],
				text: {
					format: {
						type: "json_schema",
						name: "mob_reply",
						strict: true,
						schema: RESPONSE_SCHEMA,
					},
				},
			}),
		})
	).json();
	const reply = JSON.parse(extractResponseText(response)) as Omit<
		MobReply,
		"transcript" | "audio"
	>;
	const voiceId = voiceFor(
		context.entityId,
		await getAvailableVoices(elevenLabsApiKey),
	);
	const speech = await elevenLabs(
		`/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=wav_24000`,
		elevenLabsApiKey,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ text: reply.reply }),
		},
	);

	histories.set(
		context.entityId,
		[...history, { player: transcript, mob: reply.reply }].slice(-4),
	);
	// ponytail: process memory is enough for the prototype; persist when conversations must survive restarts.
	if (histories.size > 1_000)
		histories.delete(histories.keys().next().value as string);
	return {
		transcript,
		...reply,
		audio: Buffer.from(await speech.arrayBuffer()).toString("base64"),
	};
}

export async function transcribe(input: File | string, apiKey: string) {
	if (typeof input === "string") return input.trim();
	const form = new FormData();
	form.append("file", input, "speech.wav");
	form.append("model", "gpt-transcribe");
	const transcription = (await (
		await openAI("/audio/transcriptions", apiKey, {
			method: "POST",
			body: form,
		})
	).json()) as { text?: string };
	return transcription.text?.trim();
}
