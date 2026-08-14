CREATE TABLE "user_provider_key" (
	"user_id" text PRIMARY KEY NOT NULL,
	"encrypted_openai_key" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_provider_key" ADD CONSTRAINT "user_provider_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;