import { polarClient } from "@mine-yapping/auth/lib/payments";
import { db } from "@mine-yapping/db";
import { appSettings, usageEvent } from "@mine-yapping/db/schema/app";
import { and, count, eq, gte, sql, sum } from "drizzle-orm";
import { quotaAllowed } from "./rules";

const monthStart = () => {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
};

export async function getSettings() {
	await db.insert(appSettings).values({}).onConflictDoNothing();
	const [settings] = await db.select().from(appSettings).limit(1);
	if (!settings) throw new Error("Global settings are unavailable");
	return settings;
}

export async function usageFor(userId: string) {
	const [usage] = await db
		.select({
			requests: count(),
			inputTokens: sum(usageEvent.inputTokens),
			outputTokens: sum(usageEvent.outputTokens),
			ttsCharacters: sum(usageEvent.ttsCharacters),
		})
		.from(usageEvent)
		.where(
			and(
				eq(usageEvent.userId, userId),
				eq(usageEvent.successful, true),
				gte(usageEvent.createdAt, monthStart()),
			),
		);
	return {
		requests: usage?.requests ?? 0,
		inputTokens: Number(usage?.inputTokens ?? 0),
		outputTokens: Number(usage?.outputTokens ?? 0),
		ttsCharacters: Number(usage?.ttsCharacters ?? 0),
	};
}

export async function subscriptionStatus(userId: string) {
	try {
		const state = await polarClient.customers.getStateExternal({
			externalId: userId,
		});
		return state.activeSubscriptions.length ? "pro" : "free";
	} catch {
		return "free";
	}
}

export async function reserveUsage(
	userId: string,
	inputType: "audio" | "text",
) {
	const settings = await getSettings();
	const reservedId = await db.transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
		const [usage] = await tx
			.select({ requests: count() })
			.from(usageEvent)
			.where(
				and(
					eq(usageEvent.userId, userId),
					eq(usageEvent.successful, true),
					gte(usageEvent.createdAt, monthStart()),
				),
			);
		if (
			!quotaAllowed(usage?.requests ?? 0, settings.monthlyFreeRequests, false)
		)
			return null;
		const [event] = await tx
			.insert(usageEvent)
			.values({ userId, inputType, successful: true, latencyMs: 0 })
			.returning({ id: usageEvent.id });
		return event?.id ?? null;
	});
	if (reservedId) return reservedId;

	const state = await polarClient.customers.getStateExternal({
		externalId: userId,
	});
	if (!state.activeSubscriptions.length) return null;
	const [event] = await db
		.insert(usageEvent)
		.values({ userId, inputType, successful: true, latencyMs: 0 })
		.returning({ id: usageEvent.id });
	return event?.id ?? null;
}

export const finalizeUsage = (
	id: string,
	values: Partial<
		Pick<
			typeof usageEvent.$inferInsert,
			| "successful"
			| "inputTokens"
			| "outputTokens"
			| "ttsCharacters"
			| "latencyMs"
		>
	>,
) => db.update(usageEvent).set(values).where(eq(usageEvent.id, id));

export async function globalUsage() {
	const [usage] = await db
		.select({
			requests: count(),
			failures: sql<number>`count(*) filter (where not ${usageEvent.successful})`,
			inputTokens: sum(usageEvent.inputTokens),
			outputTokens: sum(usageEvent.outputTokens),
			ttsCharacters: sum(usageEvent.ttsCharacters),
		})
		.from(usageEvent)
		.where(gte(usageEvent.createdAt, monthStart()));
	return {
		requests: usage?.requests ?? 0,
		failures: Number(usage?.failures ?? 0),
		inputTokens: Number(usage?.inputTokens ?? 0),
		outputTokens: Number(usage?.outputTokens ?? 0),
		ttsCharacters: Number(usage?.ttsCharacters ?? 0),
	};
}
