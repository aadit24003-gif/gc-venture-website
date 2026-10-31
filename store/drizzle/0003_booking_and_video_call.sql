ALTER TABLE "orders" ADD COLUMN "booking_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "video_call_at" timestamp with time zone;