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
			if (body.audio.size > 5 * 1024 * 1024)
				return status(413, "Audio must be under 5 MB");
			try {
				return await converse(body.audio, body, env.OPENAI_API_KEY);
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
				audio: t.File(),
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
