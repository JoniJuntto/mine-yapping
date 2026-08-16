import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		RESEND_API_KEY: z.string().min(1),
		AUTH_EMAIL_FROM: z.string().min(1),
		TWITCH_CLIENT_ID: z.string().min(1),
		TWITCH_CLIENT_SECRET: z.string().min(1),
		POLAR_ACCESS_TOKEN: z.string().min(1),
		POLAR_WEBHOOK_SECRET: z.string().min(1),
		POLAR_SUCCESS_URL: z.url(),
		// "credits-1000:prod_xxx,credits-1750:prod_yyy". Empty hides the packs entirely.
		POLAR_CREDIT_PRODUCTS: z.string().default(""),
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
