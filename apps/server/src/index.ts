import { cors } from "@elysiajs/cors";
import { auth } from "@mine-yapping/auth";
import { env } from "@mine-yapping/env/server";
import { Elysia, t } from "elysia";
import { getApiKeyUser } from "./access";
import { appApi } from "./app-api";
import { converse } from "./conversation";
import { promptsApi } from "./prompts";
import { getProviderKeys } from "./provider-key";
import { finalizeUsage, reserveUsage } from "./usage";

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
			return auth.handler(request);
		}
		return status(405);
	})
	.use(appApi)
	.use(promptsApi)
	.post(
		"/api/converse",
		async ({ body, request, status }) => {
			const startedAt = Date.now();
			const identity = await getApiKeyUser(request);
			if ("error" in identity) {
				return status(identity.forbidden ? 403 : 401, identity.error);
			}
			const text = body.text?.trim();
			const input = body.audio ?? text;
			if (!input || (body.audio && text))
				return status(400, "Provide either audio or text");
			if (body.audio && body.audio.size > 5 * 1024 * 1024)
				return status(413, "Audio must be under 5 MB");
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
				);
			} catch (cause) {
				console.error("Could not verify quota:", cause);
				return status(503, "Could not verify usage limit");
			}
			if (!reservationId) {
				return status(402, "Monthly free usage limit reached");
			}
			try {
				const result = await converse(
					input,
					body,
					byokKeys?.openAi ?? env.OPENAI_API_KEY,
					byokKeys?.elevenLabs ?? env.ELEVENLABS_API_KEY,
					identity.user.id,
				);
				const { usage, ...reply } = result;
				await finalizeUsage(reservationId, {
					successful: true,
					...usage,
					latencyMs: Date.now() - startedAt,
				}).catch((cause) => console.error("Could not finalize usage:", cause));
				return reply;
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
	.get("/", () => "OK")
	.listen(31415, () => {
		console.log("Server is running on http://localhost:31415");
	});
