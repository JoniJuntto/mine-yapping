import { mobPersona, mobPrompt } from "@mine-yapping/db/schema/prompts";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import {
	type Language,
	languageName,
	MAX_REPLY_TOKENS,
	MAX_TTS_CHARACTERS,
} from "./rules";

type Turn = { player: string; mob: string };

const histories = new Map<string, Turn[]>();
let availableVoices: Promise<string[]> | undefined;

export const DEFAULT_MOB_PROMPT =
	"You are {entityName}, a Minecraft {entityType}. Reply in character in at most two short sentences. Use the entity type to infer a distinct personality and speech style.";

export type MobReply = {
	transcript: string;
	reply: string;
	audio: ReadableStream<Uint8Array>;
	usage: {
		inputTokens: number;
		outputTokens: number;
		ttsCharacters: number;
	};
	latency: { sttMs: number; llmMs: number };
	completion: Promise<{ successful: boolean; ttsMs: number }>;
};

export type MobContext = {
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

type PromptChoice = {
	id: string;
	entityType: string;
	prompt: string;
	ownerUserId?: string | null;
};
type ExistingPersona = {
	promptId: string | null;
	prompt: string | null;
	voiceId: string;
};

export const choosePersona = (
	existing: ExistingPersona | undefined,
	candidates: PromptChoice[],
	entityType: string,
	voiceIds: string[],
	random = Math.random,
	userId?: string,
) => {
	if (existing?.promptId && existing.prompt) {
		return {
			promptId: existing.promptId,
			prompt: existing.prompt,
			voiceId: existing.voiceId,
			shouldPersist: false,
		};
	}
	const tiers = [
		...(userId
			? [
					candidates.filter(
						(candidate) =>
							candidate.ownerUserId === userId &&
							candidate.entityType === entityType,
					),
					candidates.filter(
						(candidate) =>
							candidate.ownerUserId === userId && candidate.entityType === "*",
					),
				]
			: []),
		candidates.filter(
			(candidate) =>
				!candidate.ownerUserId && candidate.entityType === entityType,
		),
		candidates.filter(
			(candidate) => !candidate.ownerUserId && candidate.entityType === "*",
		),
	];
	const choices = tiers.find((tier) => tier.length) ?? [];
	const choice = choices[Math.floor(random() * choices.length)];
	const voiceId =
		existing?.voiceId ?? voiceIds[Math.floor(random() * voiceIds.length)];
	if (!voiceId) throw new Error("ElevenLabs returned no voices");
	return {
		promptId: choice?.id ?? null,
		prompt: choice?.prompt ?? DEFAULT_MOB_PROMPT,
		voiceId,
		shouldPersist: true,
	};
};

export const renderPrompt = (prompt: string, context: MobContext) =>
	prompt.replace(
		/\{(\w+)\}/g,
		(_, key: string) => context[key as keyof MobContext] ?? "",
	);

export async function personaFor(
	userId: string,
	entityId: string,
	entityType: string,
	voiceIds: string[],
) {
	try {
		const { db } = await import("@mine-yapping/db");
		const [existing] = await db
			.select({
				promptId: mobPersona.promptId,
				prompt: mobPrompt.prompt,
				voiceId: mobPersona.voiceId,
			})
			.from(mobPersona)
			.leftJoin(mobPrompt, eq(mobPersona.promptId, mobPrompt.id))
			.where(
				and(eq(mobPersona.userId, userId), eq(mobPersona.entityId, entityId)),
			)
			.limit(1);
		if (existing?.promptId && existing.prompt) {
			return choosePersona(existing, [], entityType, voiceIds);
		}

		const candidates = await db
			.select({
				id: mobPrompt.id,
				ownerUserId: mobPrompt.ownerUserId,
				entityType: mobPrompt.entityType,
				prompt: mobPrompt.prompt,
			})
			.from(mobPrompt)
			.where(
				and(
					eq(mobPrompt.enabled, true),
					inArray(mobPrompt.entityType, [entityType, "*"]),
					or(eq(mobPrompt.ownerUserId, userId), isNull(mobPrompt.ownerUserId)),
				),
			);
		const persona = choosePersona(
			existing,
			candidates,
			entityType,
			voiceIds,
			Math.random,
			userId,
		);
		await db
			.insert(mobPersona)
			.values({
				userId,
				entityId,
				promptId: persona.promptId,
				voiceId: persona.voiceId,
			})
			.onConflictDoUpdate({
				target: [mobPersona.userId, mobPersona.entityId],
				set: { promptId: persona.promptId, voiceId: persona.voiceId },
			});
		return persona;
	} catch (cause) {
		console.error("Using fallback mob persona:", cause);
		return choosePersona(undefined, [], entityType, voiceIds);
	}
}

export const shiftCompleteSentence = (text: string) => {
	const match = text.match(/^([\s\S]*?[.!?]+(?:["')\]]+)?)(?=\s|$)/);
	return match
		? {
				sentence: match[1]?.trim() ?? "",
				rest: text.slice(match[0].length).trimStart(),
			}
		: null;
};

type Persona = Awaited<ReturnType<typeof personaFor>>;
type ReplyUsage = { inputTokens: number; outputTokens: number };

export const personaForConversation = (
	context: MobContext,
	elevenLabsApiKey: string,
	userId: string,
) =>
	getAvailableVoices(elevenLabsApiKey).then((voiceIds) =>
		personaFor(userId, context.entityId, context.entityType, voiceIds),
	);

async function* sseEvents(body: ReadableStream<Uint8Array>) {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let completed = false;
	try {
		while (true) {
			const { done, value } = await reader.read();
			buffer += decoder.decode(value, { stream: !done });
			const blocks = buffer.split(/\r?\n\r?\n/);
			buffer = blocks.pop() ?? "";
			for (const block of blocks) {
				const data = block
					.split(/\r?\n/)
					.filter((line) => line.startsWith("data:"))
					.map((line) => line.slice(5).trimStart())
					.join("\n");
				if (data && data !== "[DONE]")
					yield JSON.parse(data) as Record<string, unknown>;
			}
			if (done) {
				completed = true;
				break;
			}
		}
	} finally {
		if (!completed) await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
}

/** Trims a sentence to what is left of the per-request speech budget. Speech is
 * ~85% of what a request costs and a credit buys exactly one request, so the spoken
 * length needs a hard ceiling — a personality prompt asking for long answers would
 * otherwise cost several times what the request was sold for. */
export const withinSpeechBudget = (spoken: number, sentence: string) =>
	sentence.slice(0, Math.max(0, MAX_TTS_CHARACTERS - spoken));

async function generateReply(
	transcript: string,
	context: MobContext,
	persona: Persona,
	openAiApiKey: string,
	userId: string,
	language: Language,
	onSentence?: (sentence: string) => void | Promise<void>,
) {
	const historyKey = `${userId}:${context.entityId}`;
	const history = histories.get(historyKey) ?? [];
	const startedAt = Date.now();
	const response = await openAI("/responses", openAiApiKey, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model: "gpt-5.6-luna",
			// Personalities stay English because they are instructions, not output.
			instructions: `${renderPrompt(persona.prompt, context)}\nAlways reply in ${languageName(language)}, whatever language the player speaks in. Reply in at most two short sentences. Return only the spoken reply, with no label or formatting.`,
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
			reasoning: { effort: "none" },
			text: { format: { type: "text" }, verbosity: "low" },
			max_output_tokens: MAX_REPLY_TOKENS,
			// ponytail: OpenAI caps prompt_cache_key at 64 chars; truncating only costs cache locality
			prompt_cache_key: historyKey.slice(0, 64),
			store: false,
			stream: true,
		}),
	});
	if (!response.body) throw new Error("OpenAI returned no response stream");

	let reply = "";
	let pending = "";
	let spoken = 0;
	const speak = async (sentence: string) => {
		const text = withinSpeechBudget(spoken, sentence);
		if (!text) return;
		spoken += text.length;
		await onSentence?.(text);
	};
	let usage: ReplyUsage = { inputTokens: 0, outputTokens: 0 };
	for await (const event of sseEvents(response.body)) {
		if (event.type === "response.output_text.delta") {
			const delta = typeof event.delta === "string" ? event.delta : "";
			reply += delta;
			pending += delta;
			let complete = shiftCompleteSentence(pending);
			while (complete) {
				if (complete.sentence) await speak(complete.sentence);
				pending = complete.rest;
				complete = shiftCompleteSentence(pending);
			}
		} else if (event.type === "response.completed") {
			const responseUsage = (
				event.response as {
					usage?: { input_tokens?: number; output_tokens?: number };
				}
			)?.usage;
			usage = {
				inputTokens: responseUsage?.input_tokens ?? 0,
				outputTokens: responseUsage?.output_tokens ?? 0,
			};
		} else if (event.type === "response.failed" || event.type === "error") {
			throw new Error(
				`OpenAI response failed: ${JSON.stringify(event).slice(0, 300)}`,
			);
		}
	}
	if (pending.trim()) await speak(pending.trim());
	// Truncated too, so the billed ttsCharacters match what was actually spoken.
	reply = reply.trim().slice(0, MAX_TTS_CHARACTERS).trim();
	if (!reply) throw new Error("OpenAI returned no text");
	histories.set(
		historyKey,
		[...history, { player: transcript, mob: reply }].slice(-4),
	);
	// ponytail: process memory is enough for the prototype; persist when conversations must survive restarts.
	if (histories.size > 1_000)
		histories.delete(histories.keys().next().value as string);
	return { reply, usage, llmMs: Date.now() - startedAt };
}

class LiveSpeech {
	private readonly socket: WebSocket;
	private readonly opened: Promise<void>;
	private readonly finished: Promise<number>;
	private resolveOpened!: () => void;
	private rejectOpened!: (cause: unknown) => void;
	private resolveFinished!: (ttsMs: number) => void;
	private rejectFinished!: (cause: unknown) => void;
	private firstTextAt = 0;
	private firstAudioAt = 0;
	private settled = false;
	private readonly openTimeout: ReturnType<typeof setTimeout>;
	private finishTimeout?: ReturnType<typeof setTimeout>;

	constructor(
		voiceId: string,
		apiKey: string,
		language: Language,
		private readonly onAudio: (audio: Uint8Array) => void,
	) {
		this.opened = new Promise((resolve, reject) => {
			this.resolveOpened = resolve;
			this.rejectOpened = reject;
		});
		this.finished = new Promise((resolve, reject) => {
			this.resolveFinished = resolve;
			this.rejectFinished = reject;
		});
		void this.opened.catch(() => undefined);
		void this.finished.catch(() => undefined);
		this.openTimeout = setTimeout(
			() => this.fail(new Error("ElevenLabs connection timed out")),
			5_000,
		);
		const url = new URL(
			`wss://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream-input`,
		);
		url.searchParams.set("model_id", "eleven_flash_v2_5");
		url.searchParams.set("output_format", "pcm_24000");
		url.searchParams.set("auto_mode", "true");
		// Without this Flash reads Finnish text with English phonetics.
		url.searchParams.set("language_code", language);
		this.socket = new WebSocket(url);
		this.socket.addEventListener("open", () => {
			clearTimeout(this.openTimeout);
			this.socket.send(JSON.stringify({ text: " ", xi_api_key: apiKey }));
			this.resolveOpened();
		});
		this.socket.addEventListener("message", ({ data }) => {
			const message = JSON.parse(String(data)) as {
				audio?: string;
				isFinal?: boolean;
				error?: string | { message?: string };
			};
			if (message.error) {
				this.fail(
					new Error(
						typeof message.error === "string"
							? message.error
							: (message.error.message ?? "ElevenLabs stream failed"),
					),
				);
				return;
			}
			if (message.audio) {
				if (!this.firstAudioAt) this.firstAudioAt = Date.now();
				this.onAudio(Buffer.from(message.audio, "base64"));
			}
			if (message.isFinal) this.complete();
		});
		this.socket.addEventListener("error", () =>
			this.fail(new Error("ElevenLabs WebSocket failed")),
		);
		this.socket.addEventListener("close", () => {
			if (!this.settled) {
				if (this.firstAudioAt) this.complete();
				else this.fail(new Error("ElevenLabs closed without audio"));
			}
		});
	}

	private clearTimeouts() {
		clearTimeout(this.openTimeout);
		if (this.finishTimeout) clearTimeout(this.finishTimeout);
	}

	private complete() {
		if (this.settled) return;
		this.settled = true;
		this.clearTimeouts();
		this.resolveFinished(
			(this.firstAudioAt || Date.now()) - (this.firstTextAt || Date.now()),
		);
	}

	private fail(cause: unknown) {
		if (this.settled) return;
		this.settled = true;
		this.clearTimeouts();
		this.rejectOpened(cause);
		this.rejectFinished(cause);
		this.socket.close();
	}

	async send(sentence: string) {
		await this.opened;
		if (!this.firstTextAt) this.firstTextAt = Date.now();
		this.socket.send(JSON.stringify({ text: `${sentence} ` }));
	}

	async finish() {
		await this.opened;
		this.finishTimeout ??= setTimeout(
			() => this.fail(new Error("ElevenLabs audio stream timed out")),
			30_000,
		);
		this.socket.send(JSON.stringify({ text: "" }));
		return this.finished;
	}

	cancel() {
		this.clearTimeouts();
		this.settled = true;
		this.socket.close();
	}
}

export async function converseRealtime(
	transcript: string,
	context: MobContext,
	openAiApiKey: string,
	elevenLabsApiKey: string,
	userId: string,
	language: Language,
	personaPromise: Promise<Persona>,
	onAudio: (audio: Uint8Array) => void,
	onReply: (reply: string) => void,
) {
	const persona = await personaPromise;
	const speech = new LiveSpeech(
		persona.voiceId,
		elevenLabsApiKey,
		language,
		onAudio,
	);
	try {
		const generated = await generateReply(
			transcript,
			context,
			persona,
			openAiApiKey,
			userId,
			language,
			(sentence) => {
				onReply(sentence);
				return speech.send(sentence);
			},
		);
		const ttsMs = await speech.finish();
		return {
			usage: {
				...generated.usage,
				ttsCharacters: generated.reply.length,
			},
			llmMs: generated.llmMs,
			ttsMs,
		};
	} catch (cause) {
		speech.cancel();
		throw cause;
	}
}

const measuredAudioStream = (
	source: ReadableStream<Uint8Array>,
	startedAt: number,
) => {
	const reader = source.getReader();
	let firstByteAt = 0;
	let finish!: (value: { successful: boolean; ttsMs: number }) => void;
	const completion = new Promise<{ successful: boolean; ttsMs: number }>(
		(resolve) => {
			finish = resolve;
		},
	);
	const result = () => ({
		successful: true,
		ttsMs: (firstByteAt || Date.now()) - startedAt,
	});
	return {
		completion,
		audio: new ReadableStream<Uint8Array>({
			async pull(controller) {
				try {
					const { done, value } = await reader.read();
					if (done) {
						finish(result());
						controller.close();
						return;
					}
					if (!firstByteAt) firstByteAt = Date.now();
					controller.enqueue(value);
				} catch (cause) {
					finish({ ...result(), successful: false });
					controller.error(cause);
				}
			},
			async cancel(reason) {
				finish({ ...result(), successful: false });
				await reader.cancel(reason);
			},
		}),
	};
};

export async function converse(
	input: File | string,
	context: MobContext,
	openAiApiKey: string,
	elevenLabsApiKey: string,
	userId: string,
	language: Language,
): Promise<MobReply> {
	const sttStartedAt = Date.now();
	const [transcription, persona] = await Promise.all([
		transcribe(input, openAiApiKey, language).then((transcript) => ({
			transcript,
			sttMs: Date.now() - sttStartedAt,
		})),
		personaForConversation(context, elevenLabsApiKey, userId),
	]);
	const { transcript, sttMs } = transcription;
	if (!transcript) throw new Error("No speech was detected");
	const generated = await generateReply(
		transcript,
		context,
		persona,
		openAiApiKey,
		userId,
		language,
	);
	const ttsStartedAt = Date.now();
	const speech = await elevenLabs(
		`/v1/text-to-speech/${encodeURIComponent(persona.voiceId)}/stream?output_format=pcm_24000`,
		elevenLabsApiKey,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				text: generated.reply,
				model_id: "eleven_flash_v2_5",
				language_code: language,
			}),
		},
	);
	if (!speech.body) throw new Error("ElevenLabs returned no audio stream");
	const streamed = measuredAudioStream(speech.body, ttsStartedAt);
	return {
		transcript,
		reply: generated.reply,
		audio: streamed.audio,
		usage: {
			...generated.usage,
			ttsCharacters: generated.reply.length,
		},
		latency: { sttMs, llmMs: generated.llmMs },
		completion: streamed.completion,
	};
}

export async function transcribe(
	input: File | string,
	apiKey: string,
	language: Language,
) {
	if (typeof input === "string") return input.trim();
	const form = new FormData();
	form.append("file", input, "speech.wav");
	form.append("model", "gpt-4o-mini-transcribe");
	form.append("language", language);
	const transcription = (await (
		await openAI("/audio/transcriptions", apiKey, {
			method: "POST",
			body: form,
		})
	).json()) as { text?: string };
	return transcription.text?.trim();
}
