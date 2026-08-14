import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		POLAR_ACCESS_TOKEN: z.string().min(1),
		POLAR_SUCCESS_URL: z.url(),
		POLAR_SERVER: z.enum(["sandbox", "production"]).default("sandbox"),
		CORS_ORIGIN: z.url(),
		OPENAI_API_KEY: z.string().min(1),
		ELEVENLABS_API_KEY: z.string().min(1),
		DISABLE_SIGN_UP: z
			.enum(["true", "false"])
			.default("false")
			.transform((value) => value === "true"),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
