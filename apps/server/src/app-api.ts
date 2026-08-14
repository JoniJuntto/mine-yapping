import { db } from "@mine-yapping/db";
import { appSettings, usageEvent } from "@mine-yapping/db/schema/app";
import { apikey, user } from "@mine-yapping/db/schema/auth";
import { count, desc, eq, ilike, or } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { getSession, hasRole } from "./access";
import {
	deleteProviderKeys,
	hasProviderKeys,
	saveProviderKeys,
} from "./provider-key";
import { getSettings, globalUsage, usageFor } from "./usage";

const sessionApi = new Elysia({ prefix: "/api" })
	.resolve(async ({ request, status }) => {
		const session = await getSession(request);
		if (!session) return status(401, "Unauthorized");
		return { currentUser: session.user };
	})
	.get("/me/summary", async ({ currentUser }) => {
		const [settings, usage, byokConfigured] = await Promise.all([
			getSettings(),
			usageFor(currentUser.id),
			hasProviderKeys(currentUser.id),
		]);
		return {
			user: currentUser,
			usage,
			byokConfigured,
			monthlyRequestLimit: settings.monthlyFreeRequests,
			donationsEnabled: !!settings.polarProductId,
		};
	})
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
				.set({
					...body,
					polarProductId: body.polarProductId?.trim() || null,
					updatedAt: new Date(),
				})
				.where(eq(appSettings.id, "global"))
				.returning();
			return settings;
		},
		{
			body: t.Object({
				monthlyFreeRequests: t.Integer({ minimum: 0, maximum: 1_000_000 }),
				polarProductId: t.Optional(t.String({ maxLength: 200 })),
			}),
		},
	);

export const appApi = new Elysia().use(sessionApi).use(adminApi);
