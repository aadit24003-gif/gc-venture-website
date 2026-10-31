CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact" text NOT NULL,
	"topic" text NOT NULL,
	"body" text NOT NULL,
	"user_id" uuid,
	"ip" text,
	"handled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "messages_created" ON "messages" USING btree ("created_at");