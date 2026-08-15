ALTER TABLE "usage_event" ADD COLUMN "quota_key" text;--> statement-breakpoint
CREATE INDEX "usage_event_quota_created_idx" ON "usage_event" USING btree ("quota_key","created_at");