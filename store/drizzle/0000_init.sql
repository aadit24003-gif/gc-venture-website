CREATE TABLE "addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"landmark" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"pincode" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"code" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"value" integer NOT NULL,
	"min_subtotal" integer DEFAULT 0 NOT NULL,
	"max_discount" integer,
	"active" boolean DEFAULT true NOT NULL,
	"ends_at" timestamp with time zone,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" integer NOT NULL,
	"title" text NOT NULL,
	"grade" text NOT NULL,
	"ram_gb" integer NOT NULL,
	"ssd_gb" integer NOT NULL,
	"warranty_months" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"qty" integer NOT NULL,
	"student_discount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'awaiting_payment' NOT NULL,
	"payment_method" text NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"subtotal" integer NOT NULL,
	"student_discount" integer DEFAULT 0 NOT NULL,
	"coupon_code" text,
	"coupon_discount" integer DEFAULT 0 NOT NULL,
	"shipping_fee" integer DEFAULT 0 NOT NULL,
	"cod_fee" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"email" text,
	"phone" text,
	"address" jsonb NOT NULL,
	"gstin" text,
	"razorpay_order_id" text,
	"razorpay_payment_id" text,
	"courier" text,
	"tracking_number" text,
	"tracking_url" text,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "orders_number_unique" UNIQUE("number"),
	CONSTRAINT "orders_razorpayOrderId_unique" UNIQUE("razorpay_order_id")
);
--> statement-breakpoint
CREATE TABLE "otps" (
	"id" serial PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"channel" text NOT NULL,
	"destination" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"user_id" uuid,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"brand" text NOT NULL,
	"family" text NOT NULL,
	"model" text NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"cpu" text NOT NULL,
	"cpu_short" text NOT NULL,
	"cpu_tier" text NOT NULL,
	"cpu_gen" integer,
	"gpu" text NOT NULL,
	"screen_in" real NOT NULL,
	"screen_res" text NOT NULL,
	"touch" boolean DEFAULT false NOT NULL,
	"weight_kg" real,
	"os" text NOT NULL,
	"ports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ram_gb" integer NOT NULL,
	"ssd_gb" integer NOT NULL,
	"ram_options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ssd_options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"new_price" integer,
	"uses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"art" jsonb NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "student_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"method" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"full_name" text NOT NULL,
	"college" text NOT NULL,
	"course" text,
	"grad_year" integer,
	"college_email" text,
	"email_verified_at" timestamp with time zone,
	"id_front_key" text,
	"id_back_key" text,
	"reviewer_id" uuid,
	"reviewed_at" timestamp with time zone,
	"reject_reason" text,
	"approved_until" timestamp with time zone,
	"files_deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text,
	"email" text,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"grade" text NOT NULL,
	"price" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_verifications" ADD CONSTRAINT "student_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "order_events_order" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_user" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_created" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "otps_dest" ON "otps" USING btree ("destination","created_at");--> statement-breakpoint
CREATE INDEX "otps_ip" ON "otps" USING btree ("ip","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "student_user" ON "student_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "student_status" ON "student_verifications" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "variants_product_grade" ON "variants" USING btree ("product_id","grade");