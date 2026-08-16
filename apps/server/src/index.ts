import { cors } from "@elysiajs/cors";
import { auth } from "@mine-yapping/auth";
import { env } from "@mine-yapping/env/server";
import { Elysia, t } from "elysia";
import { getApiKeyUser, invalidateApiKeyUsers } from "./access";
import { appApi } from "./app-api";
import { converse } from "./conversation";
import { promptsApi } from "./prompts";
import { getProviderKeys } from "./provider-key";
import { RealtimeConversation } from "./realtime";
import { language, MAX_AUDIO_BYTES, MAX_AUDIO_MS, quotaKey } from "./rules";
import { finalizeUsage, reserveUsage } from "./usage";

const realtimeSessions = new Map<
	string,
	{
		ready: Promise<RealtimeConversation>;
		messages: Promise<void>;
	}
>();

new Elysia()
	.use(
		cors({
			origin: env.CORS_ORIGIN,
			methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
			credentials: true,
		}),
	)
	.all("/api/auth/*", async (context) => {
		const { request, status } = context;
		if (["POST", "GET"].includes(request.method)) {
			const response = await auth.handler(request);
			if (
				response.ok &&
				/(?:[\\/]admin[\\/](?:un)?ban-user|[\\/]api-key[\\/](?:delete|update))$/.test(
					new URL(request.url).pathname,
				)
			)
				invalidateApiKeyUsers();
			return response;
		}
		return status(405);
	})
	.use(appApi)
	.use(promptsApi)
	.post(
		"/api/converse",
		async ({ body, request, set, status }) => {
			const startedAt = Date.now();
			const identity = await getApiKeyUser(request);
			if ("error" in identity) {
				return status(
					"forbidden" in identity && identity.forbidden ? 403 : 401,
					identity.error,
				);
			}
			const text = body.text?.trim();
			const input = body.audio ?? text;
			if (!input || (body.audio && text))
				return status(400, "Provide either audio or text");
			// Transcription is billed per minute, so the old 5 MB ceiling was ~109 s of
			// audio — seven times a normal request, on one credit. See MAX_AUDIO_MS.
			if (body.audio && body.audio.size > MAX_AUDIO_BYTES)
				return status(
					413,
					`Audio must be under ${MAX_AUDIO_MS / 1000} seconds`,
				);
			const inputType = body.audio ? "audio" : "text";
			let byokKeys: Awaited<ReturnType<typeof getProviderKeys>>;
			try {
				byokKeys = await getProviderKeys(identity.user.id);
			} catch (cause) {
				console.error("Could not load BYOK credentials:", cause);
				return status(503, "Could not load BYOK credentials");
			}
			const billingMode = byokKeys ? "byok" : "free";
			let reservationId: string | null;
			try {
				reservationId = await reserveUsage(
					identity.user.id,
					inputType,
					billingMode,
					quotaKey(
						request.headers.get("x-forwarded-for"),
						env.BETTER_AUTH_SECRET,
						identity.user.id,
					),
				);
			} catch (cause) {
				console.error("Could not verify quota:", cause);
				return status(503, "Could not verify usage limit");
			}
			if (!reservationId) {
				return status(
					402,
					"Monthly free usage limit reached and no AI credits left",
				);
			}
			try {
				const result = await converse(
					input,
					body,
					byokKeys?.openAi ?? env.OPENAI_API_KEY,
					byokKeys?.elevenLabs ?? env.ELEVENLABS_API_KEY,
					identity.user.id,
					language(identity.user.language),
				);
				set.headers["Content-Type"] = "audio/pcm";
				set.headers["X-MineYapping-Transcript"] = Buffer.from(
					result.transcript,
				).toString("base64url");
				set.headers["X-MineYapping-Reply"] = Buffer.from(result.reply).toString(
					"base64url",
				);
				void result.completion.then(({ successful, ttsMs }) => {
					const latencyMs = Date.now() - startedAt;
					console.info(
						`conversation user=${identity.user.id} totalMs=${latencyMs} sttMs=${result.latency.sttMs} llmMs=${result.latency.llmMs} ttsMs=${ttsMs}`,
					);
					return finalizeUsage(reservationId, {
						successful,
						...result.usage,
						...result.latency,
						ttsMs,
						latencyMs,
					}).catch((cause) =>
						console.error("Could not finalize usage:", cause),
					);
				});
				return result.audio;
			} catch (cause) {
				console.error(cause);
				await finalizeUsage(reservationId, {
					successful: false,
					latencyMs: Date.now() - startedAt,
				}).catch((error) => console.error("Could not finalize usage:", error));
				return status(
					502,
					cause instanceof Error ? cause.message : "Conversation failed",
				);
			}
		},
		{
			body: t.Object({
				audio: t.Optional(t.File()),
				text: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
				entityId: t.String({ minLength: 1, maxLength: 100 }),
				entityType: t.String({ minLength: 1, maxLength: 100 }),
				entityName: t.String({ minLength: 1, maxLength: 100 }),
				playerName: t.String({ minLength: 1, maxLength: 100 }),
				dimension: t.String({ minLength: 1, maxLength: 100 }),
				health: t.String({ minLength: 1, maxLength: 30 }),
			}),
		},
	)
	.ws("/api/converse/stream", {
		query: t.Object({
			mode: t.Optional(t.Literal("text")),
			entityId: t.String({ minLength: 1, maxLength: 100 }),
			entityType: t.String({ minLength: 1, maxLength: 100 }),
			entityName: t.String({ minLength: 1, maxLength: 100 }),
			playerName: t.String({ minLength: 1, maxLength: 100 }),
			dimension: t.String({ minLength: 1, maxLength: 100 }),
			health: t.String({ minLength: 1, maxLength: 30 }),
		}),
		body: t.Union([t.String(), t.Uint8Array()]),
		open(ws) {
			const ready = RealtimeConversation.open(
				ws,
				ws.data.request,
				ws.data.query,
				ws.data.query.mode === "text",
			);
			realtimeSessions.set(ws.id, { ready, messages: Promise.resolve() });
			void ready.catch((cause) => {
				const error =
					cause instanceof Error ? cause.message : "Conversation failed";
				ws.send(JSON.stringify({ type: "error", value: error }));
				ws.close(1011, "failed");
			});
		},
		message(ws, incoming) {
			const state = realtimeSessions.get(ws.id);
			if (!state) return;
			state.messages = state.messages
				.then(async () => {
					const conversation = await state.ready;
					if (typeof incoming === "string") {
						if (incoming === "commit") conversation.commit();
						else if (incoming === "cancel") conversation.cancel();
						else if (incoming.startsWith("text:"))
							conversation.sendText(incoming.slice(5));
						return;
					}
					conversation.sendAudio(incoming);
				})
				.catch(() => undefined);
		},
		close(ws) {
			const state = realtimeSessions.get(ws.id);
			realtimeSessions.delete(ws.id);
			void state?.ready
				.then((conversation) => conversation.cancel())
				.catch(() => undefined);
		},
	})
	.get("/", () => "OK")
	.listen(31415, () => {
		console.log("Server is running on http://localhost:31415");
	});
