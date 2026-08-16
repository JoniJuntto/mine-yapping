import { db } from "@mine-yapping/db";
import {
	appSettings,
	usageEvent,
	userCredit,
} from "@mine-yapping/db/schema/app";
import { account } from "@mine-yapping/db/schema/auth";
import { and, count, eq, gte, sql, sum } from "drizzle-orm";
import { estimatedApiCostUsd, monthlyLimit } from "./rules";

const monthStart = () => {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
};

let settingsPromise: Promise<typeof appSettings.$inferSelect> | undefined;
let settingsExpiresAt = 0;
const monthlyLimits = new Map<
	string,
	{ expiresAt: number; value: Promise<number> }
>();

export function getSettings() {
	if (settingsExpiresAt <= Date.now()) {
		settingsPromise = undefined;
		settingsExpiresAt = Date.now() + 30_000;
	}
	settingsPromise ??= (async () => {
		await db.insert(appSettings).values({}).onConflictDoNothing();
		const [settings] = await db.select().from(appSettings).limit(1);
		if (!settings) throw new Error("Global settings are unavailable");
		return settings;
	})().catch((cause) => {
		settingsPromise = undefined;
		settingsExpiresAt = 0;
		throw cause;
	});
	return settingsPromise;
}

export const clearSettingsCache = () => {
	settingsPromise = undefined;
	settingsExpiresAt = 0;
	monthlyLimits.clear();
};

export function monthlyRequestLimitFor(userId: string) {
	const cached = monthlyLimits.get(userId);
	if (cached && cached.expiresAt > Date.now()) return cached.value;
	const value = Promise.all([
		getSettings(),
		db
			.select({ id: account.id })
			.from(account)
			.where(and(eq(account.userId, userId), eq(account.providerId, "twitch")))
			.limit(1),
	])
		.then(([settings, twitchAccounts]) =>
			monthlyLimit(settings.monthlyFreeRequests, twitchAccounts.length > 0),
		)
		.catch((cause) => {
			monthlyLimits.delete(userId);
			throw cause;
		});
	monthlyLimits.set(userId, { expiresAt: Date.now() + 30_000, value });
	if (monthlyLimits.size > 1_000)
		monthlyLimits.delete(monthlyLimits.keys().next().value as string);
	return value;
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
	quotaKey: string,
) {
	// ponytail: network quotas can group NAT users; use trusted device attestation if false positives matter.
	const result = await db.execute<{ id: string }>(sql`
		with quota_lock as materialized (
			select cast(${userId} as text) as user_id,
				pg_advisory_xact_lock(hashtext(${quotaKey}))
		)
		insert into ${usageEvent} ("user_id", "quota_key", "input_type", "successful", "latency_ms")
		select quota_lock.user_id, ${quotaKey}, ${inputType}, true, 0
		from quota_lock
		where (
			select count(*)
			from ${usageEvent}
			where (${usageEvent.userId} = quota_lock.user_id
				or ${usageEvent.quotaKey} = ${quotaKey})
				and ${usageEvent.billingMode} = 'free'
				and ${usageEvent.successful} = true
				and ${usageEvent.createdAt} >= ${monthStart()}
		) < ${limit}
		returning ${usageEvent.id}
	`);
	return result.rows[0]?.id ?? null;
}

/** Spends one purchased credit. The balance check and the usage row are a single
 * statement so concurrent requests cannot spend the same credit twice. */
async function spendCredit(userId: string, inputType: "audio" | "text") {
	const result = await db.execute<{ id: string }>(sql`
		with spend as (
			update ${userCredit} set "balance" = ${userCredit.balance} - 1
			where ${userCredit.userId} = ${userId} and ${userCredit.balance} > 0
			returning ${userCredit.userId} as user_id
		)
		insert into ${usageEvent} ("user_id", "quota_key", "input_type", "successful", "latency_ms", "billing_mode")
		select spend.user_id, null, ${inputType}, true, 0, 'credit'
		from spend
		returning ${usageEvent.id}
	`);
	return result.rows[0]?.id ?? null;
}

export async function reserveUsage(
	userId: string,
	inputType: "audio" | "text",
	billingMode: "free" | "byok",
	quotaKey: string,
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
	// Free allowance first: never spend something the player paid for while they
	// still have free requests left this month.
	return (
		(await reserveUnderLimit(
			userId,
			inputType,
			await monthlyRequestLimitFor(userId),
			quotaKey,
		)) ?? (await spendCredit(userId, inputType))
	);
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
			| "audioMs"
			| "latencyMs"
			| "sttMs"
			| "llmMs"
			| "ttsMs"
		>
	>,
) =>
	db.transaction(async (tx) => {
		const [event] = await tx
			.update(usageEvent)
			.set(values)
			.where(eq(usageEvent.id, id))
			.returning({
				userId: usageEvent.userId,
				billingMode: usageEvent.billingMode,
			});
		// A failed free request self-heals, because the quota only counts successful
		// rows. A spent credit does not — the balance is already down. Give it back.
		if (event && values.successful === false && event.billingMode === "credit")
			await tx
				.update(userCredit)
				.set({ balance: sql`${userCredit.balance} + 1` })
				.where(eq(userCredit.userId, event.userId));
	});

export async function creditBalance(userId: string) {
	const [record] = await db
		.select({ balance: userCredit.balance })
		.from(userCredit)
		.where(eq(userCredit.userId, userId))
		.limit(1);
	return record?.balance ?? 0;
}

export async function globalUsage() {
	const rows = await db
		.select({
			billingMode: usageEvent.billingMode,
			requests: count(),
			failures: sql<number>`count(*) filter (where not ${usageEvent.successful})`,
			inputTokens: sum(usageEvent.inputTokens),
			outputTokens: sum(usageEvent.outputTokens),
			ttsCharacters: sum(usageEvent.ttsCharacters),
			audioMs: sum(usageEvent.audioMs),
		})
		.from(usageEvent)
		.where(gte(usageEvent.createdAt, monthStart()))
		.groupBy(usageEvent.billingMode);
	const usage = Object.fromEntries(
		rows.map(({ billingMode, ...row }) => {
			const totals = {
				requests: row.requests,
				failures: Number(row.failures ?? 0),
				inputTokens: Number(row.inputTokens ?? 0),
				outputTokens: Number(row.outputTokens ?? 0),
				ttsCharacters: Number(row.ttsCharacters ?? 0),
				audioMs: Number(row.audioMs ?? 0),
			};
			return [
				billingMode,
				{ ...totals, estimatedCostUsd: estimatedApiCostUsd(totals) },
			];
		}),
	);
	const empty = {
		requests: 0,
		failures: 0,
		inputTokens: 0,
		outputTokens: 0,
		ttsCharacters: 0,
		audioMs: 0,
		estimatedCostUsd: 0,
	};
	return { free: usage.free ?? empty, byok: usage.byok ?? empty };
}
