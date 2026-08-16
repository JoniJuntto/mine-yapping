import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const appSettings = pgTable("app_settings", {
	id: text("id").primaryKey().default("global"),
	monthlyFreeRequests: integer("monthly_free_requests").default(100).notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

/** One Polar order for a credit pack. Primary key is the Polar order id, which is
 * what makes webhook redelivery idempotent — see onOrderPaid. */
export const purchase = pgTable("purchase", {
	id: text("id").primaryKey(),
	// Nulled rather than cascaded on account deletion: bookkeeping law wants the
	// order kept for six years, GDPR wants the person unlinked. Both, then.
	userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
	customerId: text("customer_id").notNull(),
	productId: text("product_id").notNull(),
	credits: integer("credits").notNull(),
	nickname: text("nickname"),
	showNickname: boolean("show_nickname").default(false).notNull(),
	amount: integer("amount").notNull(),
	currency: text("currency").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Purchased requests. Deliberately not part of the monthly allowance: that resets
 * every UTC month, and credits people paid for must not evaporate with it. */
export const userCredit = pgTable("user_credit", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	balance: integer("balance").default(0).notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const userProviderKey = pgTable("user_provider_key", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	encryptedOpenAiKey: text("encrypted_openai_key").notNull(),
	encryptedElevenLabsKey: text("encrypted_elevenlabs_key").notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const usageEvent = pgTable(
	"usage_event",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		quotaKey: text("quota_key"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		successful: boolean("successful").notNull(),
		billingMode: text("billing_mode")
			.$type<"free" | "byok" | "credit">()
			.default("free")
			.notNull(),
		inputType: text("input_type").notNull(),
		inputTokens: integer("input_tokens").default(0).notNull(),
		outputTokens: integer("output_tokens").default(0).notNull(),
		ttsCharacters: integer("tts_characters").default(0).notNull(),
		audioMs: integer("audio_ms").default(0).notNull(),
		latencyMs: integer("latency_ms").notNull(),
		sttMs: integer("stt_ms").default(0).notNull(),
		llmMs: integer("llm_ms").default(0).notNull(),
		ttsMs: integer("tts_ms").default(0).notNull(),
	},
	(table) => [
		index("usage_event_user_created_idx").on(table.userId, table.createdAt),
		index("usage_event_quota_created_idx").on(table.quotaKey, table.createdAt),
		index("usage_event_created_idx").on(table.createdAt),
	],
);
