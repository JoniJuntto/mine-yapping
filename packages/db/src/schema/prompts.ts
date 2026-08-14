import {
	boolean,
	index,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const mobPrompt = pgTable(
	"mob_prompt",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerUserId: text("owner_user_id").references(() => user.id, {
			onDelete: "cascade",
		}),
		entityType: text("entity_type").notNull(),
		label: text("label").notNull(),
		prompt: text("prompt").notNull(),
		enabled: boolean("enabled").default(true).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("mob_prompt_entity_type_idx").on(table.entityType),
		index("mob_prompt_owner_user_id_idx").on(table.ownerUserId),
	],
);

export const mobPersona = pgTable(
	"mob_persona",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		entityId: text("entity_id").notNull(),
		promptId: uuid("prompt_id").references(() => mobPrompt.id, {
			onDelete: "set null",
		}),
		voiceId: text("voice_id").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [primaryKey({ columns: [table.userId, table.entityId] })],
);
