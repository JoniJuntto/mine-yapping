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
	polarProductId: text("polar_product_id"),
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
		createdAt: timestamp("created_at").defaultNow().notNull(),
		successful: boolean("successful").notNull(),
		inputType: text("input_type").notNull(),
		inputTokens: integer("input_tokens").default(0).notNull(),
		outputTokens: integer("output_tokens").default(0).notNull(),
		ttsCharacters: integer("tts_characters").default(0).notNull(),
		latencyMs: integer("latency_ms").notNull(),
	},
	(table) => [
		index("usage_event_user_created_idx").on(table.userId, table.createdAt),
		index("usage_event_created_idx").on(table.createdAt),
	],
);
