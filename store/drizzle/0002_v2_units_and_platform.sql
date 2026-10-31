CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"actor_label" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"data" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 100 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"cart_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"ram_gb" integer NOT NULL,
	"ssd_gb" integer NOT NULL,
	"warranty_months" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_userId_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 100 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid,
	"email" text,
	"phone" text,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" uuid NOT NULL,
	"inspector_id" uuid,
	"inspector_name" text NOT NULL,
	"passed" boolean NOT NULL,
	"battery_health" integer,
	"battery_cycles" integer,
	"ssd_health" integer,
	"checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"product_id" text NOT NULL,
	"grade" text NOT NULL,
	"serial_number" text NOT NULL,
	"status" text DEFAULT 'intake' NOT NULL,
	"ram_gb" integer NOT NULL,
	"ssd_gb" integer NOT NULL,
	"battery_health" integer,
	"battery_cycles" integer,
	"ssd_health" integer,
	"colour" text,
	"keyboard" text,
	"cosmetic_notes" text,
	"internal_notes" text,
	"price" integer,
	"purchase_cost" integer,
	"purchase_source" text,
	"purchase_ref" text,
	"purchased_at" timestamp with time zone,
	"location" text,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"order_id" uuid,
	"reserved_until" timestamp with time zone,
	"listed_at" timestamp with time zone,
	"sold_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_units_code_unique" UNIQUE("code"),
	CONSTRAINT "inventory_units_serialNumber_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"key" text NOT NULL,
	"channel" text NOT NULL,
	"name" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"template" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text,
	"status" text NOT NULL,
	"error" text,
	"ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body" text NOT NULL,
	"needs_review" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_order_id" text,
	"provider_payment_id" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text NOT NULL,
	"method" text,
	"error_reason" text,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_providerPaymentId_unique" UNIQUE("provider_payment_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"cover" text,
	"author_name" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"day" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recent_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"payment_id" uuid,
	"service_request_id" integer,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_refund_id" text,
	"by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "refunds_providerRefundId_unique" UNIQUE("provider_refund_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid,
	"rating" integer NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"author_name" text NOT NULL,
	"city" text,
	"verified" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reply" text,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"internal" boolean DEFAULT false NOT NULL,
	"by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"kind" text NOT NULL,
	"user_id" uuid,
	"order_id" uuid NOT NULL,
	"order_item_id" integer,
	"unit_id" uuid,
	"reason" text NOT NULL,
	"details" text NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"resolution" text,
	"refund_amount" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "service_requests_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"service_request_id" integer,
	"direction" text DEFAULT 'forward' NOT NULL,
	"carrier" text,
	"awb" text,
	"tracking_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weight_grams" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'subscribed' NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"author_id" uuid,
	"from_staff" boolean DEFAULT false NOT NULL,
	"internal" boolean DEFAULT false NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"contact" text NOT NULL,
	"subject" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"order_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"assignee_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "unit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"note" text,
	"by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" uuid NOT NULL,
	"part" text NOT NULL,
	"detail" text,
	"cost" integer,
	"by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warranties" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_item_id" integer NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid,
	"unit_id" uuid,
	"title" text NOT NULL,
	"serial_number" text,
	"months" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warranties_orderItemId_unique" UNIQUE("order_item_id")
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "first_order_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "per_user_limit" integer;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "brands" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "unit_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "unit_code" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "serial_number" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "battery_health" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_token_hash" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "categories" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "specs" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'customer' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "marketing_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_unit_id_inventory_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."inventory_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_unit_id_inventory_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."inventory_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_views" ADD CONSTRAINT "recent_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_views" ADD CONSTRAINT "recent_views_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_events" ADD CONSTRAINT "service_events_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_events" ADD CONSTRAINT "unit_events_unit_id_inventory_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."inventory_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_parts" ADD CONSTRAINT "unit_parts_unit_id_inventory_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."inventory_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "auth_tokens_user" ON "auth_tokens" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_unit" ON "cart_items" USING btree ("cart_id","unit_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_code" ON "coupon_redemptions" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_redemptions_order" ON "coupon_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "inspections_unit" ON "inspections" USING btree ("unit_id","created_at");--> statement-breakpoint
CREATE INDEX "units_product_status" ON "inventory_units" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "units_status" ON "inventory_units" USING btree ("status");--> statement-breakpoint
CREATE INDEX "units_order" ON "inventory_units" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_templates_key_channel" ON "notification_templates" USING btree ("key","channel");--> statement-breakpoint
CREATE INDEX "notifications_created" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payments_order" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_views_product_day" ON "product_views" USING btree ("product_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "recent_views_user_product" ON "recent_views" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "refunds_order" ON "refunds" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_user_product" ON "reviews" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "reviews_product" ON "reviews" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "service_events_request" ON "service_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "service_requests_user" ON "service_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "service_requests_status" ON "service_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "shipments_order" ON "shipments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "shipments_awb" ON "shipments" USING btree ("awb");--> statement-breakpoint
CREATE INDEX "ticket_messages_ticket" ON "ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "tickets_user" ON "tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tickets_status" ON "tickets" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "unit_events_unit" ON "unit_events" USING btree ("unit_id","created_at");--> statement-breakpoint
CREATE INDEX "unit_parts_unit" ON "unit_parts" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "warranties_user" ON "warranties" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlists_user_product" ON "wishlists" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_unit" ON "order_items" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_email" ON "orders" USING btree ("email");--> statement-breakpoint
CREATE INDEX "orders_phone" ON "orders" USING btree ("phone");--> statement-breakpoint
-- Carry over: contact-form messages become support tickets.
INSERT INTO "tickets" ("number", "user_id", "name", "contact", "subject", "category", "status", "created_at", "updated_at")
SELECT 'T-' || lpad("id"::text, 5, '0'), "user_id", "name", "contact", left("topic", 120), 'other',
  CASE WHEN "handled" THEN 'resolved' ELSE 'open' END, "created_at", "created_at" FROM "messages";--> statement-breakpoint
INSERT INTO "ticket_messages" ("ticket_id", "author_id", "from_staff", "body", "created_at")
SELECT t."id", m."user_id", false, m."body", m."created_at" FROM "messages" m JOIN "tickets" t ON t."number" = 'T-' || lpad(m."id"::text, 5, '0');--> statement-breakpoint
-- Carry over: one payment record per existing order.
INSERT INTO "payments" ("order_id", "provider", "provider_order_id", "provider_payment_id", "amount", "status", "created_at", "updated_at")
SELECT "id", "payment_method", "razorpay_order_id", "razorpay_payment_id", "total",
  CASE "payment_status" WHEN 'paid' THEN 'captured' WHEN 'failed' THEN 'failed' WHEN 'refunded' THEN 'refunded' WHEN 'cod_due' THEN 'cod_due' ELSE 'created' END,
  "created_at", "created_at" FROM "orders";
