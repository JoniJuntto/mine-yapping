import { apiKey } from "@better-auth/api-key";
import { createDb } from "@mine-yapping/db";
import { appSettings } from "@mine-yapping/db/schema/app";
import * as schema from "@mine-yapping/db/schema/auth";
import { env } from "@mine-yapping/env/server";
import { checkout, polar, portal } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { polarClient } from "./lib/payments";

export function createAuth() {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",

			schema: schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN],
		emailAndPassword: {
			enabled: true,
			disableSignUp: env.DISABLE_SIGN_UP,
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "lax",
				secure: env.NODE_ENV === "production",
				httpOnly: true,
			},
		},
		plugins: [
			admin({ defaultRole: "user", adminRoles: ["admin"] }),
			apiKey({
				defaultPrefix: "my_",
				requireName: true,
				rateLimit: { enabled: false },
			}),
			polar({
				client: polarClient,
				createCustomerOnSignUp: true,
				enableCustomerPortal: true,
				use: [
					checkout({
						products: async () => {
							const [settings] = await db.select().from(appSettings).limit(1);
							return settings?.polarProductId
								? [{ productId: settings.polarProductId, slug: "pro" }]
								: [];
						},
						successUrl: env.POLAR_SUCCESS_URL,
						authenticatedUsersOnly: true,
					}),
					portal(),
				],
			}),
		],
	});
}

export const auth = createAuth();
