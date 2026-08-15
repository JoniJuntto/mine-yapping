import { apiKey } from "@better-auth/api-key";
import { createDb } from "@mine-yapping/db";
import { appSettings, donation } from "@mine-yapping/db/schema/app";
import * as schema from "@mine-yapping/db/schema/auth";
import { env } from "@mine-yapping/env/server";
import { checkout, polar, webhooks } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { Resend } from "resend";

import { donorMetadata } from "./donation";
import { polarClient } from "./lib/payments";

const resend = new Resend(env.RESEND_API_KEY);

async function sendAuthEmail(to: string, subject: string, url: string) {
	const { error } = await resend.emails.send({
		from: env.AUTH_EMAIL_FROM,
		to,
		subject,
		text: `${subject}: ${url}\n\nIf you did not request this, ignore this email.`,
	});
	if (error) throw new Error(error.message);
}

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
			requireEmailVerification: true,
			revokeSessionsOnPasswordReset: true,
			sendResetPassword: async ({ user, url }) => {
				void sendAuthEmail(
					user.email,
					"Reset your Mine Yapping password",
					url,
				).catch(console.error);
			},
		},
		emailVerification: {
			sendOnSignUp: true,
			sendOnSignIn: true,
			sendVerificationEmail: async ({ user, url }) => {
				void sendAuthEmail(
					user.email,
					"Verify your Mine Yapping email",
					url,
				).catch(console.error);
			},
		},
		rateLimit: { enabled: true },
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
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
