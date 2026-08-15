ALTER TABLE "usage_event" ADD COLUMN "stt_ms" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_event" ADD COLUMN "llm_ms" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_event" ADD COLUMN "tts_ms" integer DEFAULT 0 NOT NULL;