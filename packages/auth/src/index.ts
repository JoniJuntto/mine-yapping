import { apiKey } from "@better-auth/api-key";
import { createDb } from "@mine-yapping/db";
import { appSettings, donation } from "@mine-yapping/db/schema/app";
import * as schema from "@mine-yapping/db/schema/auth";
import { env } from "@mine-yapping/env/server";
import { checkout, polar, webhooks } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { donorMetadata } from "./donation";
import { polarClient } from "./lib/payments";

export function createAuth() {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",

			schema: schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN],
		socialProviders: {
			twitch: {
				clientId: env.TWITCH_CLIENT_ID,
				clientSecret: env.TWITCH_CLIENT_SECRET,
				disableSignUp: env.DISABLE_SIGN_UP,
			},
		},
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
				use: [
					checkout({
						products: async () => {
							const [settings] = await db.select().from(appSettings).limit(1);
							return settings?.polarProductId
								? [{ productId: settings.polarProductId, slug: "donate" }]
								: [];
						},
						successUrl: env.POLAR_SUCCESS_URL,
						authenticatedUsersOnly: false,
					}),
					webhooks({
						secret: env.POLAR_WEBHOOK_SECRET,
						onOrderPaid: async ({ data }) => {
							const [settings] = await db.select().from(appSettings).limit(1);
							if (data.productId !== settings?.polarProductId) return;
							const donor = donorMetadata(data.metadata);
							await db
								.insert(donation)
								.values({
									id: data.id,
									customerId: data.customerId,
									...donor,
									amount: data.totalAmount,
									currency: data.currency,
									createdAt: data.createdAt,
								})
								.onConflictDoNothing();
						},
					}),
				],
			}),
		],
	});
}

export const auth = createAuth();
