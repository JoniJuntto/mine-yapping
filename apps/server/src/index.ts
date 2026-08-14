import { cors } from "@elysiajs/cors";
import { auth } from "@mine-yapping/auth";
import { env } from "@mine-yapping/env/server";
import { Elysia, t } from "elysia";
import { converse } from "./conversation";

new Elysia()
	.use(
		cors({
			origin: env.CORS_ORIGIN,
			methods: ["GET", "POST", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
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
	.post(
		"/api/converse",
		async ({ body, status }) => {
			const text = body.text?.trim();
			const input = body.audio ?? text;
			if (!input || (body.audio && text))
				return status(400, "Provide either audio or text");
			if (body.audio && body.audio.size > 5 * 1024 * 1024)
				return status(413, "Audio must be under 5 MB");
			try {
				return await converse(
					input,
					body,
					env.OPENAI_API_KEY,
					env.ELEVENLABS_API_KEY,
				);
			} catch (cause) {
				console.error(cause);
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
