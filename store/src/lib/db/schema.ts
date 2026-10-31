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
  createdAt: now(),
  updatedAt: now(),
});

/** One row per product and condition grade: its price and units in stock. */
export const variants = pgTable('variants', {
  id: serial().primaryKey(),
  productId: text().notNull().references(() => products.id, { onDelete: 'cascade' }),
  grade: text().notNull(), // pristine | excellent | good
  price: integer().notNull(),
  stock: integer().notNull().default(0),
  active: boolean().notNull().default(true),
}, (t) => [uniqueIndex('variants_product_grade').on(t.productId, t.grade)]);

/* ── People and sessions ───────────────────────────────────── */

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  phone: text().unique(), // 10 digits, India
  email: text().unique(), // lower-case
  name: text(),
  createdAt: now(),
  lastLoginAt: timestamp({ withTimezone: true }),
});

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
  createdAt: now(),
}, (t) => [index('addresses_user').on(t.userId)]);

/* ── Orders ────────────────────────────────────────────────── */

export type OrderAddress = {
  name: string; phone: string; line1: string; line2?: string | null; landmark?: string | null;
  city: string; state: string; pincode: string;
};

export const orders = pgTable('orders', {
  id: uuid().primaryKey().defaultRandom(),
  number: text().notNull().unique(),
  userId: uuid().notNull().references(() => users.id),
  /** placed → confirmed → packed → shipped → delivered; or cancelled / returned */
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
}, (t) => [index('orders_user').on(t.userId), index('orders_created').on(t.createdAt)]);

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
});

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
  kind: text().notNull(), // percent | flat
  value: integer().notNull(), // percent (e.g. 5) or paise
  minSubtotal: integer().notNull().default(0),
  maxDiscount: integer(),
  active: boolean().notNull().default(true),
  endsAt: timestamp({ withTimezone: true }),
  usageLimit: integer(),
  usedCount: integer().notNull().default(0),
  note: text(),
  createdAt: now(),
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
