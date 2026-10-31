/**
 * Business settings staff can change in /admin/settings without a deploy.
 * Defaults come from config.ts; a row in the settings table overrides them.
 * Read with getSettings() on the server (cached for 30 seconds).
 */
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './db';
import { settings as settingsTable } from './db/schema';
import { CONTACT, LEGAL, POLICY } from './config';

export const BusinessSchema = z.object({
  /** [CONFIRM] Registered name of the selling company. */
  legalName: z.string().trim().min(2).max(120),
  gstin: z.string().trim().toUpperCase().max(15).nullable(),
  cin: z.string().trim().max(30).nullable(),
  phone: z.string().trim().max(20),
  whatsapp: z.string().trim().max(20),
  email: z.string().trim().email(),
  hours: z.string().trim().max(80),
  grievanceName: z.string().trim().max(80).nullable(),
  grievanceEmail: z.string().trim().email(),
  registeredAddress: z.string().trim().max(300),
  returnAddress: z.string().trim().max(300),
});

export const ShippingSchema = z.object({
  flatFee: z.number().int().min(0), // paise
  freeAbove: z.number().int().min(0), // paise; 0 = always the flat fee (0 = free)
  codEnabled: z.boolean(),
  codFee: z.number().int().min(0),
  codMax: z.number().int().min(0),
  dispatchMin: z.number().int().min(0).max(30),
  dispatchMax: z.number().int().min(0).max(30),
  /** PIN code prefixes you do not deliver to, e.g. "744" (Andaman). */
  blockedPinPrefixes: z.array(z.string().regex(/^\d{1,6}$/)).max(200),
  /** manual: staff enter the courier and AWB. shiprocket: labels and tracking through Shiprocket. */
  provider: z.enum(['manual', 'shiprocket']),
  pickupPincode: z.string().regex(/^[1-9]\d{5}$/),
});

export const TaxSchema = z.object({
  gstRate: z.number().min(0).max(28),
  /** [CONFIRM] regular (18% on the sale price) or margin scheme for second-hand goods. */
  scheme: z.enum(['regular', 'margin']),
  sellerState: z.string().trim().min(2),
  hsn: z.string().trim().max(10),
});

export type BusinessSettings = z.infer<typeof BusinessSchema>;
export type ShippingSettings = z.infer<typeof ShippingSchema>;
export type TaxSettings = z.infer<typeof TaxSchema>;
export type Settings = { business: BusinessSettings; shipping: ShippingSettings; tax: TaxSettings };

export const DEFAULT_SETTINGS: Settings = {
  business: {
    legalName: LEGAL.entity,
    gstin: LEGAL.gstin,
    cin: null,
    phone: CONTACT.phone,
    whatsapp: CONTACT.whatsapp,
    email: CONTACT.email,
    hours: CONTACT.hours,
    grievanceName: LEGAL.grievanceOfficer.name,
    grievanceEmail: LEGAL.grievanceOfficer.email,
    registeredAddress: LEGAL.addresses[0].lines.join(', '),
    returnAddress: LEGAL.addresses[0].lines.join(', '),
  },
  shipping: {
    flatFee: POLICY.shippingFee,
    freeAbove: 0,
    codEnabled: POLICY.cod.enabled,
    codFee: POLICY.cod.fee,
    codMax: POLICY.cod.maxOrder,
    dispatchMin: POLICY.dispatchDays.min,
    dispatchMax: POLICY.dispatchDays.max,
    blockedPinPrefixes: [],
    provider: 'manual',
    pickupPincode: '122018',
  },
  tax: { gstRate: 18, scheme: 'regular', sellerState: 'Haryana', hsn: '8471' },
};

const SCHEMAS = { business: BusinessSchema, shipping: ShippingSchema, tax: TaxSchema } as const;
export type SettingsKey = keyof typeof SCHEMAS;

type Holder = { at: number; value: Settings } | null;
let cache: Holder = null;

export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value;
  const d = await db();
  const rows = await d.select().from(settingsTable);
  const value = structuredClone(DEFAULT_SETTINGS) as Settings;
  for (const r of rows) {
    const key = r.key as SettingsKey;
    if (!(key in SCHEMAS)) continue;
    const merged = { ...(value[key] as object), ...(r.value as object) };
    const parsed = SCHEMAS[key].safeParse(merged);
    if (parsed.success) (value as Record<string, unknown>)[key] = parsed.data;
  }
  cache = { at: Date.now(), value };
  return value;
}

export async function saveSettings<K extends SettingsKey>(key: K, input: unknown, byUserId: string) {
  const parsed = SCHEMAS[key].safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Check the values.' };
  const d = await db();
  const [row] = await d.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  if (row) await d.update(settingsTable).set({ value: parsed.data, updatedBy: byUserId, updatedAt: new Date() }).where(eq(settingsTable.key, key));
  else await d.insert(settingsTable).values({ key, value: parsed.data, updatedBy: byUserId });
  cache = null;
  return { ok: true as const, value: parsed.data };
}
