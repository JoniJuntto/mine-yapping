import { apiKey } from "@better-auth/api-key";
import { createDb } from "@mine-yapping/db";
import { purchase, userCredit } from "@mine-yapping/db/schema/app";
import * as schema from "@mine-yapping/db/schema/auth";
import { env } from "@mine-yapping/env/server";
import { checkout, polar, webhooks } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { sql } from "drizzle-orm";
import { Resend } from "resend";

import { creditProducts, supporterMetadata } from "./credits";
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
			autoSignInAfterVerification: true,
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
						products: async () =>
							creditProducts(env.POLAR_CREDIT_PRODUCTS).map(
								({ productId, pack }) => ({ productId, slug: pack.slug }),
							),
						successUrl: env.POLAR_SUCCESS_URL,
						// Credits land on an account, so we have to know whose.
						authenticatedUsersOnly: true,
					}),
					webhooks({
						secret: env.POLAR_WEBHOOK_SECRET,
						onOrderPaid: async ({ data }) => {
							const product = creditProducts(env.POLAR_CREDIT_PRODUCTS).find(
								({ productId }) => productId === data.productId,
							);
							if (!product) return;
							const { pack } = product;
							const userId = data.customer?.externalId;
							if (!userId) {
								console.error(
									`Polar order ${data.id} has no external customer id; credits not granted`,
								);
								return;
							}
							// The order id is the primary key, so a redelivered webhook
							// inserts nothing and therefore grants nothing twice.
							await db.transaction(async (tx) => {
								const [inserted] = await tx
									.insert(purchase)
									.values({
										id: data.id,
										userId,
										customerId: data.customerId,
										productId: product.productId,
										credits: pack.credits,
										...supporterMetadata(data.metadata),
										amount: data.totalAmount,
										currency: data.currency,
										createdAt: data.createdAt,
									})
									.onConflictDoNothing()
									.returning({ id: purchase.id });
								if (!inserted) return;
								await tx
									.insert(userCredit)
									.values({ userId, balance: pack.credits })
									.onConflictDoUpdate({
										target: userCredit.userId,
										set: {
											balance: sql`${userCredit.balance} + ${pack.credits}`,
										},
									});
							});
						},
					}),
				],
			}),
		],
	});
}

export const auth = createAuth();
