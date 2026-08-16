import { env } from "@mine-yapping/env/server";
import { getApiKeyUser } from "./access";
import {
	converseRealtime,
	type MobContext,
	personaForConversation,
} from "./conversation";
import { getProviderKeys } from "./provider-key";
import {
	type Language,
	MAX_AUDIO_BYTES,
	MAX_AUDIO_MS,
	quotaKey,
	language as resolveLanguage,
} from "./rules";
import { finalizeUsage, reserveUsage } from "./usage";

type ClientSocket = {
	send(data: string | Uint8Array): unknown;
	close(code?: number, reason?: string): unknown;
};

const message = (type: string, value?: string) =>
	JSON.stringify({ type, ...(value ? { value } : {}) });

export class RealtimeConversation {
	private bytesReceived = 0;
	private committedAt = 0;
	private responding = false;
	private finalized = false;
	private transcriptionTimeout?: ReturnType<typeof setTimeout>;

	private constructor(
		private readonly client: ClientSocket,
		private readonly transcriber: WebSocket,
		private readonly context: MobContext,
		private readonly userId: string,
		private readonly reservationId: string,
		private readonly openAiApiKey: string,
		private readonly elevenLabsApiKey: string,
		private readonly language: Language,
		private readonly persona: ReturnType<typeof personaForConversation>,
	) {
		transcriber.addEventListener("message", ({ data }) =>
			this.onTranscriptionMessage(String(data)),
		);
		transcriber.addEventListener("error", () =>
			this.fail(new Error("OpenAI transcription WebSocket failed")),
		);
		transcriber.addEventListener("close", ({ code }) => {
			if (!this.responding && code !== 1000)
				this.fail(new Error(`OpenAI transcription closed (${code})`));
		});
	}

	static async open(
		client: ClientSocket,
		request: Request,
		context: MobContext,
	) {
		const identity = await getApiKeyUser(request);
		if ("error" in identity) throw new Error(identity.error);
		const keys = await getProviderKeys(identity.user.id);
		const billingMode = keys ? "byok" : "free";
		const reservationId = await reserveUsage(
			identity.user.id,
			"audio",
			billingMode,
			quotaKey(
				request.headers.get("x-forwarded-for"),
				env.BETTER_AUTH_SECRET,
				identity.user.id,
			),
		);
		if (!reservationId)
			throw new Error(
				"Monthly free usage limit reached and no AI credits left",
			);
		const openAiApiKey = keys?.openAi ?? env.OPENAI_API_KEY;
		const elevenLabsApiKey = keys?.elevenLabs ?? env.ELEVENLABS_API_KEY;
		const language = resolveLanguage(identity.user.language);
		const persona = personaForConversation(
			context,
			elevenLabsApiKey,
			identity.user.id,
		);
		void persona.catch(() => undefined);

		try {
			const transcriber = await RealtimeConversation.openTranscriber(
				openAiApiKey,
				language,
			);
			const conversation = new RealtimeConversation(
				client,
				transcriber,
				context,
				identity.user.id,
				reservationId,
				openAiApiKey,
				elevenLabsApiKey,
				language,
				persona,
			);
			client.send(message("ready"));
			return conversation;
		} catch (cause) {
			await finalizeUsage(reservationId, { successful: false });
			throw cause;
		}
	}

	private static openTranscriber(apiKey: string, language: Language) {
		return new Promise<WebSocket>((resolve, reject) => {
			const socket = new WebSocket(
				"wss://api.openai.com/v1/realtime?model=gpt-realtime-2.1",
				{ headers: { Authorization: `Bearer ${apiKey}` } },
			);
			const timeout = setTimeout(() => {
				socket.close();
				reject(new Error("OpenAI transcription connection timed out"));
			}, 5_000);
			socket.addEventListener("open", () => {
				clearTimeout(timeout);
				socket.send(
					JSON.stringify({
						type: "session.update",
						session: {
							type: "realtime",
							audio: {
								input: {
									format: { type: "audio/pcm", rate: 24_000 },
									transcription: {
										model: "gpt-live-transcribe",
										// Left to auto-detect, Finnish speech comes back as garbled English.
										language,
										delay: "low",
									},
									turn_detection: null,
								},
							},
						},
					}),
				);
				resolve(socket);
			});
			socket.addEventListener("error", () => {
				clearTimeout(timeout);
				reject(new Error("Could not connect to OpenAI transcription"));
			});
		});
	}

	private armTranscriptionTimeout() {
		this.transcriptionTimeout ??= setTimeout(
			() => this.fail(new Error("OpenAI transcription timed out")),
			10_000,
		);
	}

	sendAudio(audio: Uint8Array) {
		if (this.responding) return;
		this.bytesReceived += audio.byteLength;
		// Same ceiling as the HTTP path: one credit must not buy minutes of
		// transcription. bytesReceived/48 is the ms conversion used in respond().
		if (this.bytesReceived > MAX_AUDIO_BYTES) {
			this.fail(new Error(`Audio must be under ${MAX_AUDIO_MS / 1000} seconds`));
			return;
		}
		this.transcriber.send(
			JSON.stringify({
				type: "input_audio_buffer.append",
				audio: Buffer.from(audio).toString("base64"),
			}),
		);
	}

	commit() {
		if (this.responding || this.committedAt) return;
		if (this.bytesReceived < 1_000) {
			this.fail(new Error("Hold V a little longer so I can hear you"));
			return;
		}
		this.committedAt = Date.now();
		this.armTranscriptionTimeout();
		this.transcriber.send(
			JSON.stringify({ type: "input_audio_buffer.commit" }),
		);
	}

	private onTranscriptionMessage(data: string) {
		const event = JSON.parse(data) as {
			type?: string;
			transcript?: string;
			error?: { message?: string };
		};
		if (event.type === "input_audio_buffer.committed") {
			if (!this.committedAt) this.committedAt = Date.now();
			this.armTranscriptionTimeout();
		}
		if (event.type === "error") {
			this.fail(
				new Error(event.error?.message ?? "OpenAI transcription failed"),
			);
			return;
		}
		if (event.type === "conversation.item.input_audio_transcription.failed") {
			this.fail(
				new Error(event.error?.message ?? "OpenAI transcription failed"),
			);
			return;
		}
		if (
			event.type === "conversation.item.input_audio_transcription.completed" &&
			event.transcript?.trim() &&
			!this.responding
		) {
			void this.respond(event.transcript.trim());
		}
	}

	private async respond(transcript: string) {
		this.responding = true;
		if (this.transcriptionTimeout) clearTimeout(this.transcriptionTimeout);
		this.transcriber.close();
		const sttMs = Date.now() - (this.committedAt || Date.now());
		const startedAt = this.committedAt || Date.now();
		this.client.send(message("transcript", transcript));
		try {
			const result = await converseRealtime(
				transcript,
				this.context,
				this.openAiApiKey,
				this.elevenLabsApiKey,
				this.userId,
				this.language,
				this.persona,
				(audio) => this.client.send(audio),
				(reply) => this.client.send(message("reply", reply)),
			);
			await this.finalize(true, {
				...result.usage,
				audioMs: Math.round(this.bytesReceived / 48),
				sttMs,
				llmMs: result.llmMs,
				ttsMs: result.ttsMs,
				latencyMs: Date.now() - startedAt,
			});
			console.info(
				`conversation user=${this.userId} totalMs=${Date.now() - startedAt} sttMs=${sttMs} llmMs=${result.llmMs} ttsMs=${result.ttsMs}`,
			);
			this.client.send(message("done"));
			this.client.close(1000, "complete");
		} catch (cause) {
			this.fail(cause);
		}
	}

	private async finalize(
		successful: boolean,
		values: Parameters<typeof finalizeUsage>[1] = {},
	) {
		if (this.finalized) return;
		this.finalized = true;
		if (this.transcriptionTimeout) clearTimeout(this.transcriptionTimeout);
		await finalizeUsage(this.reservationId, { successful, ...values }).catch(
			(cause) => console.error("Could not finalize realtime usage:", cause),
		);
	}

	fail(cause: unknown) {
		if (this.finalized) return;
		const error =
			cause instanceof Error ? cause : new Error("Conversation failed");
		console.error(error);
		this.transcriber.close();
		void this.finalize(false, {
			audioMs: Math.round(this.bytesReceived / 48),
			latencyMs: this.committedAt ? Date.now() - this.committedAt : 0,
		});
		this.client.send(message("error", error.message));
		this.client.close(1011, "failed");
	}

	cancel() {
		if (this.finalized) return;
		this.transcriber.close();
		void this.finalize(false, {
			audioMs: Math.round(this.bytesReceived / 48),
		});
	}
}
