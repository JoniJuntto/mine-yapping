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
			requests: sql<number>`count(*) filter (where ${usageEvent.billingMode} = 'free')`,
			byokRequests: sql<number>`count(*) filter (where ${usageEvent.billingMode} = 'byok')`,
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
		requests: Number(usage?.requests ?? 0),
		byokRequests: Number(usage?.byokRequests ?? 0),
		inputTokens: Number(usage?.inputTokens ?? 0),
		outputTokens: Number(usage?.outputTokens ?? 0),
		ttsCharacters: Number(usage?.ttsCharacters ?? 0),
	};
}

async function reserveUnderLimit(
	userId: string,
	inputType: "audio" | "text",
	limit: number,
) {
	return db.transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
		const [usage] = await tx
			.select({ requests: count() })
			.from(usageEvent)
			.where(
				and(
					eq(usageEvent.userId, userId),
					eq(usageEvent.billingMode, "free"),
					eq(usageEvent.successful, true),
					gte(usageEvent.createdAt, monthStart()),
				),
			);
		if (!quotaAllowed(usage?.requests ?? 0, limit)) return null;
		const [event] = await tx
			.insert(usageEvent)
			.values({ userId, inputType, successful: true, latencyMs: 0 })
			.returning({ id: usageEvent.id });
		return event?.id ?? null;
	});
}

export async function reserveUsage(
	userId: string,
	inputType: "audio" | "text",
	billingMode: "free" | "byok",
) {
	if (billingMode === "byok") {
		const [event] = await db
			.insert(usageEvent)
			.values({
				userId,
				inputType,
				billingMode,
				successful: true,
				latencyMs: 0,
			})
			.returning({ id: usageEvent.id });
		return event?.id ?? null;
	}
	const settings = await getSettings();
	return reserveUnderLimit(userId, inputType, settings.monthlyFreeRequests);
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
	const rows = await db
		.select({
			billingMode: usageEvent.billingMode,
			requests: count(),
			failures: sql<number>`count(*) filter (where not ${usageEvent.successful})`,
			inputTokens: sum(usageEvent.inputTokens),
			outputTokens: sum(usageEvent.outputTokens),
			ttsCharacters: sum(usageEvent.ttsCharacters),
		})
		.from(usageEvent)
		.where(gte(usageEvent.createdAt, monthStart()))
		.groupBy(usageEvent.billingMode);
	const usage = Object.fromEntries(
		rows.map(({ billingMode, ...row }) => [
			billingMode,
			{
				requests: row.requests,
				failures: Number(row.failures ?? 0),
				inputTokens: Number(row.inputTokens ?? 0),
				outputTokens: Number(row.outputTokens ?? 0),
				ttsCharacters: Number(row.ttsCharacters ?? 0),
			},
		]),
	);
	const empty = {
		requests: 0,
		failures: 0,
		inputTokens: 0,
		outputTokens: 0,
		ttsCharacters: 0,
	};
	return { free: usage.free ?? empty, byok: usage.byok ?? empty };
}
