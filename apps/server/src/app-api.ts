import { db } from "@mine-yapping/db";
import { appSettings, purchase, usageEvent } from "@mine-yapping/db/schema/app";
import { apikey, user } from "@mine-yapping/db/schema/auth";
import { count, desc, eq, ilike, isNotNull, or, sql, sum } from "drizzle-orm";
import { Elysia, t } from "elysia";
import {
	getApiKeyUser,
	getSession,
	hasRole,
	invalidateApiKeyUsers,
} from "./access";
import {
	deleteProviderKeys,
	hasProviderKeys,
	saveProviderKeys,
} from "./provider-key";
import { CREDIT_PACKS, language } from "./rules";
import {
	clearSettingsCache,
	creditBalance,
	getSettings,
	globalUsage,
	monthlyRequestLimitFor,
	usageFor,
} from "./usage";

const languageSchema = t.Union([t.Literal("fi"), t.Literal("en")]);

async function languageFor(userId: string) {
	const [record] = await db
		.select({ language: user.language })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	return language(record?.language);
}

const sessionApi = new Elysia({ prefix: "/api" })
	.resolve(async ({ request, status }) => {
		const session = await getSession(request);
		if (!session) return status(401, "Unauthorized");
		return { currentUser: session.user };
	})
	.get("/me/summary", async ({ currentUser }) => {
		const [monthlyRequestLimit, usage, byokConfigured, credits, language] =
			await Promise.all([
				monthlyRequestLimitFor(currentUser.id),
				usageFor(currentUser.id),
				hasProviderKeys(currentUser.id),
				creditBalance(currentUser.id),
				languageFor(currentUser.id),
			]);
		return {
			user: { ...currentUser, language },
			usage,
			byokConfigured,
			monthlyRequestLimit,
			credits,
			packs: CREDIT_PACKS,
		};
	})
	.patch(
		"/me",
		async ({ body, currentUser }) => {
			await db
				.update(user)
				.set({ language: body.language })
				.where(eq(user.id, currentUser.id));
			// The API-key identity cache holds the old language for up to a minute.
			invalidateApiKeyUsers();
			return { language: body.language };
		},
		{ body: t.Object({ language: languageSchema }) },
	)
	.put(
		"/me/provider-keys",
		async ({ body, currentUser }) => {
			await saveProviderKeys(
				currentUser.id,
				body.openAiApiKey,
				body.elevenLabsApiKey,
			);
			return { configured: true };
		},
		{
			body: t.Object({
				openAiApiKey: t.String({
					minLength: 1,
					maxLength: 512,
					pattern: "\\S",
				}),
				elevenLabsApiKey: t.String({
					minLength: 1,
					maxLength: 512,
					pattern: "\\S",
				}),
			}),
		},
	)
	.delete("/me/provider-keys", async ({ currentUser, status }) => {
		await deleteProviderKeys(currentUser.id);
		return status(204);
	});

// The mod authenticates with its Minecraft API key, not a browser session.
const modApi = new Elysia({ prefix: "/api" }).get(
	"/me/language",
	async ({ request, status }) => {
		const identity = await getApiKeyUser(request);
		if ("error" in identity)
			return status(
				"forbidden" in identity && identity.forbidden ? 403 : 401,
				identity.error,
			);
		return { language: language(identity.user.language) };
	},
);

const publicApi = new Elysia({ prefix: "/api" })
	.get("/stats", async () => ({
		estimatedCostUsd: (await globalUsage()).free.estimatedCostUsd,
	}))
	.get("/packs", () => ({ packs: CREDIT_PACKS }))
	.get("/supporters", async () => {
		const supporters = await db
			.select({
				userId: purchase.userId,
				nickname: sql<
					string | null
				>`(array_agg(${purchase.nickname} order by ${purchase.createdAt} desc))[1]`,
				showNickname: sql<boolean>`(array_agg(${purchase.showNickname} order by ${purchase.createdAt} desc))[1]`,
				credits: sum(purchase.credits).mapWith(Number),
			})
			.from(purchase)
			// Deleted accounts keep their order row for accounting but leave the list.
			.where(isNotNull(purchase.userId))
			.groupBy(purchase.userId)
			.orderBy(desc(sum(purchase.credits)));
		// Amounts paid stay private — the list is a thank-you, not a receipt.
		return supporters.map(({ userId: _, nickname, showNickname, credits }) => ({
			credits,
			nickname: showNickname && nickname ? nickname : "Anonymous",
		}));
	});

const adminApi = new Elysia({ prefix: "/api/admin" })
	.resolve(async ({ request, status }) => {
		const session = await getSession(request);
		if (!session) return status(401, "Unauthorized");
		if (!hasRole(session.user.role, "admin")) return status(403, "Forbidden");
		return { currentUser: session.user };
	})
	.get("/overview", async () => {
		const [[users], usage, failures] = await Promise.all([
			db.select({ count: count() }).from(user),
			globalUsage(),
			db
				.select({
					id: usageEvent.id,
					createdAt: usageEvent.createdAt,
					latencyMs: usageEvent.latencyMs,
					billingMode: usageEvent.billingMode,
					email: user.email,
				})
				.from(usageEvent)
				.innerJoin(user, eq(usageEvent.userId, user.id))
				.where(eq(usageEvent.successful, false))
				.orderBy(desc(usageEvent.createdAt))
				.limit(10),
		]);
		return {
			users: users?.count ?? 0,
			usage,
			failures,
		};
	})
	.get(
		"/users",
		async ({ query }) => {
			const records = await db
				.select()
				.from(user)
				.where(
					query.search
						? or(
								ilike(user.email, `%${query.search}%`),
								ilike(user.name, `%${query.search}%`),
							)
						: undefined,
				)
				.orderBy(desc(user.createdAt))
				.limit(50);
			return Promise.all(
				records.map(async (record) => ({
					...record,
					usage: await usageFor(record.id),
				})),
			);
		},
		{ query: t.Object({ search: t.Optional(t.String({ maxLength: 100 })) }) },
	)
	.delete(
		"/users/:id/api-keys",
		async ({ params, status }) => {
			const deleted = await db
				.delete(apikey)
				.where(eq(apikey.referenceId, params.id))
				.returning({ id: apikey.id });
			invalidateApiKeyUsers();
			return status(200, { revoked: deleted.length });
		},
		{ params: t.Object({ id: t.String({ minLength: 1 }) }) },
	)
	.get("/settings", () => getSettings())
	.patch(
		"/settings",
		async ({ body }) => {
			await getSettings();
			const [settings] = await db
				.update(appSettings)
				.set({ ...body, updatedAt: new Date() })
				.where(eq(appSettings.id, "global"))
				.returning();
			clearSettingsCache();
			return settings;
		},
		{
			body: t.Object({
				monthlyFreeRequests: t.Integer({ minimum: 0, maximum: 1_000_000 }),
			}),
		},
	);

export const appApi = new Elysia()
	.use(publicApi)
	.use(modApi)
	.use(sessionApi)
	.use(adminApi);
