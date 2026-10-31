/**
 * Database schema (PostgreSQL). Money is stored in paise (integer), as Razorpay expects.
 * After changing this file run `npm run db:generate` to write a new migration.
 */
import {
  pgTable, text, integer, boolean, timestamp, jsonb, uuid, serial, index, uniqueIndex, real,
} from 'drizzle-orm/pg-core';

const now = () => timestamp({ withTimezone: true }).notNull().defaultNow();

/* ── Catalogue ─────────────────────────────────────────────── */

export type ArtSpec = {
  /** Which outline to draw when there is no photo. */
  style: 'thinkpad' | 'latitude' | 'elitebook' | 'probook' | 'macbook-air' | 'macbook-pro';
  colour: 'black' | 'silver' | 'graphite' | 'space-grey' | 'midnight' | 'starlight';
  notch?: boolean;
};
export type ProductImage = { src: string; alt: string; width: number; height: number };
export type UpgradeOption = { gb: number; price: number };

export const products = pgTable('products', {
  id: text().primaryKey(), // same as slug
  slug: text().notNull().unique(),
  brand: text().notNull(),
  family: text().notNull(),
  model: text().notNull(),
  title: text().notNull(),
  year: integer(),
  cpu: text().notNull(),
  cpuShort: text().notNull(),
  cpuTier: text().notNull(), // i3 | i5 | i7 | ultra5 | ultra7 | m1 | m2 | m3 ...
  cpuGen: integer(), // Intel generation (6..14), Core Ultra = 15, Apple = null
  gpu: text().notNull(),
  screenIn: real().notNull(),
  screenRes: text().notNull(),
  touch: boolean().notNull().default(false),
  weightKg: real(),
  os: text().notNull(),
  ports: jsonb().$type<string[]>().notNull().default([]),
  ramGb: integer().notNull(),
  ssdGb: integer().notNull(),
  ramOptions: jsonb().$type<UpgradeOption[]>().notNull().default([]),
  ssdOptions: jsonb().$type<UpgradeOption[]>().notNull().default([]),
  newPrice: integer(), // approximate price when new, paise
  uses: jsonb().$type<string[]>().notNull().default([]),
  highlights: jsonb().$type<string[]>().notNull().default([]),
  description: text().notNull(),
  images: jsonb().$type<ProductImage[]>().notNull().default([]),
  art: jsonb().$type<ArtSpec>().notNull(),
  featured: boolean().notNull().default(false),
  active: boolean().notNull().default(true),
  sort: integer().notNull().default(100),
  /** Free-form labels used for filtering and merchandising, e.g. "backlit", "thunderbolt". */
  tags: jsonb().$type<string[]>().notNull().default([]),
  /** Category slugs this model belongs to (see categories). */
  categories: jsonb().$type<string[]>().notNull().default([]),
  /** Extra specification rows shown on the product page, e.g. { Battery: '57 Wh' }. */
  specs: jsonb().$type<Record<string, string>>().notNull().default({}),
  seoTitle: text(),
  seoDescription: text(),
  createdAt: now(),
  updatedAt: now(),
});

export const brands = pgTable('brands', {
  slug: text().primaryKey(),
  name: text().notNull().unique(),
  description: text().notNull().default(''),
  sort: integer().notNull().default(100),
  active: boolean().notNull().default(true),
  createdAt: now(),
});

export const categories = pgTable('categories', {
  slug: text().primaryKey(),
  name: text().notNull(),
  description: text().notNull().default(''),
  sort: integer().notNull().default(100),
  active: boolean().notNull().default(true),
  createdAt: now(),
});

/**
 * One row per product and condition grade: the list price for that grade.
 * Availability comes from inventory_units; `stock` is kept only for databases created
 * before unit-level inventory and is no longer read.
 */
export const variants = pgTable('variants', {
  id: serial().primaryKey(),
  productId: text().notNull().references(() => products.id, { onDelete: 'cascade' }),
  grade: text().notNull(), // pristine | excellent | good
  price: integer().notNull(),
  stock: integer().notNull().default(0),
  active: boolean().notNull().default(true),
}, (t) => [uniqueIndex('variants_product_grade').on(t.productId, t.grade)]);

/* ── Inventory: every physical laptop is a unit ────────────── */

/**
 * intake → inspection → refurbishing → available → reserved → sold;
 * also returned, rma (with the supplier or under repair), hold, scrapped.
 */
export const UNIT_STATUSES = ['intake', 'inspection', 'refurbishing', 'available', 'reserved', 'sold', 'returned', 'rma', 'hold', 'scrapped'] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const inventoryUnits = pgTable('inventory_units', {
  id: uuid().primaryKey().defaultRandom(),
  /** Short public ID printed on the unit's inspection report, e.g. U-2611-7Q4K. */
  code: text().notNull().unique(),
  productId: text().notNull().references(() => products.id),
  grade: text().notNull(),
  /** Manufacturer serial or service tag. Staff only. */
  serialNumber: text().notNull().unique(),
  status: text().$type<UnitStatus>().notNull().default('intake'),
  ramGb: integer().notNull(),
  ssdGb: integer().notNull(),
  batteryHealth: integer(), // % of design capacity, measured
  batteryCycles: integer(),
  ssdHealth: integer(), // % remaining, measured
  colour: text(),
  keyboard: text(),
  /** What the customer should know about this unit's look, in plain words. */
  cosmeticNotes: text(),
  internalNotes: text(),
  /** Overrides the grade price for this unit (paise). */
  price: integer(),
  purchaseCost: integer(), // paise, staff only
  purchaseSource: text(),
  purchaseRef: text(),
  purchasedAt: timestamp({ withTimezone: true }),
  location: text(),
  photos: jsonb().$type<ProductImage[]>().notNull().default([]),
  orderId: uuid(),
  reservedUntil: timestamp({ withTimezone: true }),
  listedAt: timestamp({ withTimezone: true }),
  soldAt: timestamp({ withTimezone: true }),
  createdAt: now(),
  updatedAt: now(),
}, (t) => [index('units_product_status').on(t.productId, t.status), index('units_status').on(t.status), index('units_order').on(t.orderId)]);

export type InspectionCheck = { group: string; item: string; result: 'pass' | 'fail' | 'na'; note?: string | null };

/** A bench inspection of one unit. The latest one is the unit's public report. */
export const inspections = pgTable('inspections', {
  id: serial().primaryKey(),
  unitId: uuid().notNull().references(() => inventoryUnits.id, { onDelete: 'cascade' }),
  inspectorId: uuid(),
  inspectorName: text().notNull(),
  passed: boolean().notNull(),
  batteryHealth: integer(),
  batteryCycles: integer(),
  ssdHealth: integer(),
  checks: jsonb().$type<InspectionCheck[]>().notNull().default([]),
  summary: text(),
  createdAt: now(),
}, (t) => [index('inspections_unit').on(t.unitId, t.createdAt)]);

/** Parts replaced during refurbishment (battery, keyboard, SSD, screen...). */
export const unitParts = pgTable('unit_parts', {
  id: serial().primaryKey(),
  unitId: uuid().notNull().references(() => inventoryUnits.id, { onDelete: 'cascade' }),
  part: text().notNull(),
  detail: text(),
  cost: integer(),
  byUserId: uuid(),
  createdAt: now(),
}, (t) => [index('unit_parts_unit').on(t.unitId)]);

/** Every change to a unit, for its history. */
export const unitEvents = pgTable('unit_events', {
  id: serial().primaryKey(),
  unitId: uuid().notNull().references(() => inventoryUnits.id, { onDelete: 'cascade' }),
  kind: text().notNull(), // created | status | price | inspection | part | edit | note
  fromStatus: text(),
  toStatus: text(),
  note: text(),
  byUserId: uuid(),
  createdAt: now(),
}, (t) => [index('unit_events_unit').on(t.unitId, t.createdAt)]);

/* ── People and sessions ───────────────────────────────────── */

export const ROLES = ['customer', 'super_admin', 'inventory_manager', 'order_manager', 'support'] as const;
export type Role = (typeof ROLES)[number];

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  phone: text().unique(), // 10 digits, India
  email: text().unique(), // lower-case
  name: text(),
  role: text().$type<Role>().notNull().default('customer'),
  /** scrypt hash; null for accounts that only sign in with one-time codes. */
  passwordHash: text(),
  emailVerifiedAt: timestamp({ withTimezone: true }),
  phoneVerifiedAt: timestamp({ withTimezone: true }),
  marketingOptIn: boolean().notNull().default(false),
  disabledAt: timestamp({ withTimezone: true }),
  createdAt: now(),
  lastLoginAt: timestamp({ withTimezone: true }),
});

/** Single-use links: email verification and password reset. Only the hash is stored. */
export const authTokens = pgTable('auth_tokens', {
  id: text().primaryKey(), // sha256 of the token
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose: text().notNull(), // verify_email | reset_password
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  usedAt: timestamp({ withTimezone: true }),
  createdAt: now(),
}, (t) => [index('auth_tokens_user').on(t.userId, t.purpose)]);

export const sessions = pgTable('sessions', {
  id: text().primaryKey(), // sha256 of the cookie token
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: now(),
  userAgent: text(),
}, (t) => [index('sessions_user').on(t.userId)]);

/** One-time codes for login and for confirming a college email. */
export const otps = pgTable('otps', {
  id: serial().primaryKey(),
  purpose: text().notNull(), // login | student_email
  channel: text().notNull(), // sms | email
  destination: text().notNull(),
  codeHash: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  attempts: integer().notNull().default(0),
  consumedAt: timestamp({ withTimezone: true }),
  userId: uuid(),
  ip: text(),
  createdAt: now(),
}, (t) => [index('otps_dest').on(t.destination, t.createdAt), index('otps_ip').on(t.ip, t.createdAt)]);

export const addresses = pgTable('addresses', {
  id: serial().primaryKey(),
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  phone: text().notNull(),
  line1: text().notNull(),
  line2: text(),
  landmark: text(),
  city: text().notNull(),
  state: text().notNull(),
  pincode: text().notNull(),
  isDefault: boolean().notNull().default(false),
  label: text(), // Home, Office...
  createdAt: now(),
}, (t) => [index('addresses_user').on(t.userId)]);

/* ── Carts, wishlists, recently viewed ─────────────────────── */

/** A cart lives in the database; guests are identified by a cookie, members by their account. */
export const carts = pgTable('carts', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().unique().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: now(),
  updatedAt: now(),
});

export const cartItems = pgTable('cart_items', {
  id: serial().primaryKey(),
  cartId: uuid().notNull().references(() => carts.id, { onDelete: 'cascade' }),
  unitId: uuid().notNull().references(() => inventoryUnits.id, { onDelete: 'cascade' }),
  ramGb: integer().notNull(),
  ssdGb: integer().notNull(),
  warrantyMonths: integer().notNull(),
  addedAt: now(),
}, (t) => [uniqueIndex('cart_items_cart_unit').on(t.cartId, t.unitId)]);

export const wishlists = pgTable('wishlists', {
  id: serial().primaryKey(),
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: text().notNull().references(() => products.id, { onDelete: 'cascade' }),
  createdAt: now(),
}, (t) => [uniqueIndex('wishlists_user_product').on(t.userId, t.productId)]);

export const recentViews = pgTable('recent_views', {
  id: serial().primaryKey(),
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: text().notNull().references(() => products.id, { onDelete: 'cascade' }),
  viewedAt: now(),
}, (t) => [uniqueIndex('recent_views_user_product').on(t.userId, t.productId)]);

/** Daily product page views, for "popular" sorting and analytics. */
export const productViews = pgTable('product_views', {
  id: serial().primaryKey(),
  productId: text().notNull().references(() => products.id, { onDelete: 'cascade' }),
  day: text().notNull(), // YYYY-MM-DD (India time)
  views: integer().notNull().default(0),
}, (t) => [uniqueIndex('product_views_product_day').on(t.productId, t.day)]);

/* ── Orders ────────────────────────────────────────────────── */

export type OrderAddress = {
  name: string; phone: string; line1: string; line2?: string | null; landmark?: string | null;
  city: string; state: string; pincode: string;
};

export const orders = pgTable('orders', {
  id: uuid().primaryKey().defaultRandom(),
  number: text().notNull().unique(),
  /** Null for guest checkout; the guest opens the order with a private link (guestToken). */
  userId: uuid().references(() => users.id),
  guestTokenHash: text(),
  /**
   * awaiting_payment → confirmed → quality_check → packed → shipped → in_transit →
   * out_for_delivery → delivered; or payment_failed, cancelled, delivery_failed, returned.
   */
  status: text().notNull().default('awaiting_payment'),
  paymentMethod: text().notNull(), // razorpay | cod | demo
  paymentStatus: text().notNull().default('pending'), // pending | paid | failed | refunded | cod_due
  subtotal: integer().notNull(),
  studentDiscount: integer().notNull().default(0),
  couponCode: text(),
  couponDiscount: integer().notNull().default(0),
  shippingFee: integer().notNull().default(0),
  codFee: integer().notNull().default(0),
  total: integer().notNull(),
  /** GST contained in the total (prices include tax). */
  taxAmount: integer().notNull().default(0),
  refundedAmount: integer().notNull().default(0),
  cancelReason: text(),
  email: text(),
  phone: text(),
  address: jsonb().$type<OrderAddress>().notNull(),
  gstin: text(),
  razorpayOrderId: text().unique(),
  razorpayPaymentId: text(),
  courier: text(),
  trackingNumber: text(),
  trackingUrl: text(),
  adminNote: text(),
  createdAt: now(),
  paidAt: timestamp({ withTimezone: true }),
  shippedAt: timestamp({ withTimezone: true }),
  deliveredAt: timestamp({ withTimezone: true }),
  cancelledAt: timestamp({ withTimezone: true }),
  updatedAt: timestamp({ withTimezone: true }),
}, (t) => [index('orders_user').on(t.userId), index('orders_created').on(t.createdAt), index('orders_status').on(t.status), index('orders_email').on(t.email), index('orders_phone').on(t.phone)]);

export const orderItems = pgTable('order_items', {
  id: serial().primaryKey(),
  orderId: uuid().notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text().notNull().references(() => products.id),
  variantId: integer().notNull().references(() => variants.id),
  title: text().notNull(),
  grade: text().notNull(),
  ramGb: integer().notNull(),
  ssdGb: integer().notNull(),
  warrantyMonths: integer().notNull(),
  unitPrice: integer().notNull(), // after upgrades and warranty, before discounts
  qty: integer().notNull(),
  studentDiscount: integer().notNull().default(0),
  /** The physical laptop sold (null on orders placed before unit-level inventory). */
  unitId: uuid(),
  unitCode: text(),
  serialNumber: text(),
  batteryHealth: integer(),
}, (t) => [index('order_items_order').on(t.orderId), index('order_items_unit').on(t.unitId)]);

/* ── Payments, refunds, shipments ──────────────────────────── */

export const payments = pgTable('payments', {
  id: uuid().primaryKey().defaultRandom(),
  orderId: uuid().notNull().references(() => orders.id, { onDelete: 'cascade' }),
  provider: text().notNull(), // razorpay | cod | demo
  providerOrderId: text(),
  providerPaymentId: text().unique(),
  amount: integer().notNull(),
  currency: text().notNull().default('INR'),
  /** created | captured | failed | refunded | partially_refunded | cod_due | cod_collected */
  status: text().notNull(),
  method: text(), // upi | card | netbanking | wallet | emi | cod
  errorReason: text(),
  raw: jsonb(),
  createdAt: now(),
  updatedAt: now(),
}, (t) => [index('payments_order').on(t.orderId)]);

export const refunds = pgTable('refunds', {
  id: uuid().primaryKey().defaultRandom(),
  orderId: uuid().notNull().references(() => orders.id, { onDelete: 'cascade' }),
  paymentId: uuid(),
  serviceRequestId: integer(),
  amount: integer().notNull(),
  reason: text().notNull(),
  /** pending | processed | failed | manual (paid outside Razorpay, e.g. COD by bank transfer) */
  status: text().notNull().default('pending'),
  providerRefundId: text().unique(),
  byUserId: uuid(),
  createdAt: now(),
  processedAt: timestamp({ withTimezone: true }),
}, (t) => [index('refunds_order').on(t.orderId)]);

export type ShipmentEvent = { at: string; status: string; note?: string | null; location?: string | null };

export const shipments = pgTable('shipments', {
  id: serial().primaryKey(),
  orderId: uuid().notNull().references(() => orders.id, { onDelete: 'cascade' }),
  serviceRequestId: integer(),
  direction: text().notNull().default('forward'), // forward | return
  carrier: text(),
  awb: text(),
  trackingUrl: text(),
  /** pending | label_created | picked_up | in_transit | out_for_delivery | delivered | failed | rto | cancelled */
  status: text().notNull().default('pending'),
  events: jsonb().$type<ShipmentEvent[]>().notNull().default([]),
  weightGrams: integer(),
  createdAt: now(),
  updatedAt: now(),
  deliveredAt: timestamp({ withTimezone: true }),
}, (t) => [index('shipments_order').on(t.orderId), index('shipments_awb').on(t.awb)]);

export const orderEvents = pgTable('order_events', {
  id: serial().primaryKey(),
  orderId: uuid().notNull().references(() => orders.id, { onDelete: 'cascade' }),
  status: text().notNull(),
  note: text(),
  byUserId: uuid(),
  createdAt: now(),
}, (t) => [index('order_events_order').on(t.orderId)]);

export const coupons = pgTable('coupons', {
  code: text().primaryKey(), // upper-case
  kind: text().notNull(), // percent | flat (fixed amount)
  value: integer().notNull(), // percent (e.g. 5) or paise
  minSubtotal: integer().notNull().default(0),
  maxDiscount: integer(),
  active: boolean().notNull().default(true),
  endsAt: timestamp({ withTimezone: true }),
  usageLimit: integer(),
  usedCount: integer().notNull().default(0),
  note: text(),
  startsAt: timestamp({ withTimezone: true }),
  /** Only on a customer's first paid order. */
  firstOrderOnly: boolean().notNull().default(false),
  perUserLimit: integer(),
  /** Restrict to these product ids / brand names; empty means any. */
  productIds: jsonb().$type<string[]>().notNull().default([]),
  brands: jsonb().$type<string[]>().notNull().default([]),
  createdAt: now(),
});

export const couponRedemptions = pgTable('coupon_redemptions', {
  id: serial().primaryKey(),
  code: text().notNull(),
  orderId: uuid().notNull().references(() => orders.id, { onDelete: 'cascade' }),
  userId: uuid(),
  email: text(),
  phone: text(),
  amount: integer().notNull(),
  createdAt: now(),
}, (t) => [index('coupon_redemptions_code').on(t.code), uniqueIndex('coupon_redemptions_order').on(t.orderId)]);

/* ── After the sale ────────────────────────────────────────── */

/** One warranty per laptop sold, created when the order is delivered. */
export const warranties = pgTable('warranties', {
  id: serial().primaryKey(),
  orderItemId: integer().notNull().unique().references(() => orderItems.id, { onDelete: 'cascade' }),
  orderId: uuid().notNull().references(() => orders.id, { onDelete: 'cascade' }),
  userId: uuid(),
  unitId: uuid(),
  title: text().notNull(),
  serialNumber: text(),
  months: integer().notNull(),
  startsAt: timestamp({ withTimezone: true }).notNull(),
  endsAt: timestamp({ withTimezone: true }).notNull(),
  status: text().notNull().default('active'), // active | void
  createdAt: now(),
}, (t) => [index('warranties_user').on(t.userId)]);

/**
 * Returns, replacements, complaints and warranty claims.
 * requested → approved → pickup_scheduled → received → inspected → refunded | replaced | repaired → closed;
 * or rejected / cancelled.
 */
export const serviceRequests = pgTable('service_requests', {
  id: serial().primaryKey(),
  number: text().notNull().unique(),
  kind: text().notNull(), // return | replacement | complaint | warranty
  userId: uuid(),
  orderId: uuid().notNull().references(() => orders.id, { onDelete: 'cascade' }),
  orderItemId: integer(),
  unitId: uuid(),
  reason: text().notNull(),
  details: text().notNull(),
  photos: jsonb().$type<string[]>().notNull().default([]),
  status: text().notNull().default('requested'),
  resolution: text(),
  refundAmount: integer(),
  createdAt: now(),
  updatedAt: now(),
  closedAt: timestamp({ withTimezone: true }),
}, (t) => [index('service_requests_user').on(t.userId), index('service_requests_status').on(t.status, t.createdAt)]);

export const serviceEvents = pgTable('service_events', {
  id: serial().primaryKey(),
  requestId: integer().notNull().references(() => serviceRequests.id, { onDelete: 'cascade' }),
  status: text().notNull(),
  note: text(),
  /** Internal notes are visible to staff only. */
  internal: boolean().notNull().default(false),
  byUserId: uuid(),
  createdAt: now(),
}, (t) => [index('service_events_request').on(t.requestId)]);

/** Product reviews: only from customers who received the laptop; shown after moderation. */
export const reviews = pgTable('reviews', {
  id: serial().primaryKey(),
  productId: text().notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  orderId: uuid(),
  rating: integer().notNull(),
  title: text(),
  body: text().notNull(),
  authorName: text().notNull(),
  city: text(),
  verified: boolean().notNull().default(false),
  status: text().notNull().default('pending'), // pending | approved | rejected
  reply: text(),
  moderatedBy: uuid(),
  moderatedAt: timestamp({ withTimezone: true }),
  createdAt: now(),
}, (t) => [uniqueIndex('reviews_user_product').on(t.userId, t.productId), index('reviews_product').on(t.productId, t.status)]);

/** Support tickets, from the contact form or from signed-in customers. */
export const tickets = pgTable('tickets', {
  id: serial().primaryKey(),
  number: text().notNull().unique(),
  userId: uuid(),
  name: text().notNull(),
  contact: text().notNull(),
  subject: text().notNull(),
  category: text().notNull().default('other'), // order | product | payment | warranty | student | business | other
  orderId: uuid(),
  status: text().notNull().default('open'), // open | waiting_customer | resolved | closed
  priority: text().notNull().default('normal'), // normal | high
  assigneeId: uuid(),
  createdAt: now(),
  updatedAt: now(),
}, (t) => [index('tickets_user').on(t.userId), index('tickets_status').on(t.status, t.updatedAt)]);

export const ticketMessages = pgTable('ticket_messages', {
  id: serial().primaryKey(),
  ticketId: integer().notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  authorId: uuid(),
  fromStaff: boolean().notNull().default(false),
  internal: boolean().notNull().default(false),
  body: text().notNull(),
  createdAt: now(),
}, (t) => [index('ticket_messages_ticket').on(t.ticketId)]);

/* ── Notifications, audit, content, settings ───────────────── */

/** Editable message templates. Placeholders look like {{order_number}}. */
export const notificationTemplates = pgTable('notification_templates', {
  key: text().notNull(),
  channel: text().notNull(), // email | sms | whatsapp
  name: text().notNull(),
  subject: text(),
  body: text().notNull(),
  enabled: boolean().notNull().default(true),
  updatedBy: uuid(),
  updatedAt: now(),
}, (t) => [uniqueIndex('notification_templates_key_channel').on(t.key, t.channel)]);

/** Every message sent (or not), so delivery problems can be traced. */
export const notifications = pgTable('notifications', {
  id: serial().primaryKey(),
  channel: text().notNull(),
  template: text().notNull(),
  recipient: text().notNull(),
  subject: text(),
  status: text().notNull(), // sent | failed | skipped | demo
  error: text(),
  ref: text(), // e.g. order number
  createdAt: now(),
}, (t) => [index('notifications_created').on(t.createdAt)]);

export const auditLogs = pgTable('audit_logs', {
  id: serial().primaryKey(),
  actorId: uuid(),
  actorLabel: text(),
  action: text().notNull(), // e.g. order.status, unit.update, coupon.create
  entity: text().notNull(),
  entityId: text(),
  data: jsonb(),
  ip: text(),
  createdAt: now(),
}, (t) => [index('audit_entity').on(t.entity, t.entityId), index('audit_created').on(t.createdAt)]);

/** Editable pages: terms, privacy, refund policy and so on (Markdown). */
export const pages = pgTable('pages', {
  slug: text().primaryKey(),
  title: text().notNull(),
  summary: text(),
  body: text().notNull(),
  /** Stays true until someone confirms a lawyer has reviewed the text. */
  needsReview: boolean().notNull().default(true),
  updatedBy: uuid(),
  updatedAt: now(),
});

export const posts = pgTable('posts', {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  title: text().notNull(),
  excerpt: text().notNull().default(''),
  body: text().notNull(),
  cover: text(),
  authorName: text().notNull(),
  tags: jsonb().$type<string[]>().notNull().default([]),
  status: text().notNull().default('draft'), // draft | published
  publishedAt: timestamp({ withTimezone: true }),
  createdAt: now(),
  updatedAt: now(),
});

export const subscribers = pgTable('subscribers', {
  id: serial().primaryKey(),
  email: text().notNull().unique(),
  status: text().notNull().default('subscribed'), // subscribed | unsubscribed
  source: text(),
  createdAt: now(),
  unsubscribedAt: timestamp({ withTimezone: true }),
});

/** Business settings that staff can change without a deploy (contact details, shipping, tax). */
export const settings = pgTable('settings', {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedBy: uuid(),
  updatedAt: now(),
});

/** Razorpay webhook deliveries, kept so each event is handled once. */
export const webhookEvents = pgTable('webhook_events', {
  id: text().primaryKey(),
  event: text().notNull(),
  payload: jsonb().notNull(),
  receivedAt: now(),
});

/* ── Students ──────────────────────────────────────────────── */

export const studentVerifications = pgTable('student_verifications', {
  id: serial().primaryKey(),
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  method: text().notNull(), // email | id_card
  status: text().notNull().default('pending'), // pending | approved | rejected
  fullName: text().notNull(),
  college: text().notNull(),
  course: text(),
  gradYear: integer(),
  collegeEmail: text(),
  emailVerifiedAt: timestamp({ withTimezone: true }),
  idFrontKey: text(),
  idBackKey: text(),
  reviewerId: uuid(),
  reviewedAt: timestamp({ withTimezone: true }),
  rejectReason: text(),
  approvedUntil: timestamp({ withTimezone: true }),
  filesDeletedAt: timestamp({ withTimezone: true }),
  createdAt: now(),
}, (t) => [index('student_user').on(t.userId), index('student_status').on(t.status, t.createdAt)]);

/* ── Contact form ──────────────────────────────────────────── */

/** Messages from the contact form, kept so none is lost if email delivery fails. */
export const messages = pgTable('messages', {
  id: serial().primaryKey(),
  name: text().notNull(),
  contact: text().notNull(),
  topic: text().notNull(),
  body: text().notNull(),
  userId: uuid(),
  ip: text(),
  handled: boolean().notNull().default(false),
  createdAt: now(),
}, (t) => [index('messages_created').on(t.createdAt)]);
