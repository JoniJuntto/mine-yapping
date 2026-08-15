CREATE TABLE "donation" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"nickname" text,
	"show_nickname" boolean DEFAULT false NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
