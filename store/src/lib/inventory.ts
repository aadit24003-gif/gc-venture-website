/**
 * Unit-level inventory. Every physical laptop is one row in inventory_units, with its own
 * grade, measured battery and SSD health, cosmetic notes and inspection report. Customers
 * choose a specific unit, so what they see is what ships.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db, type DB } from './db';
import {
  inspections, inventoryUnits, products, unitEvents, variants,
  type InspectionCheck, type ProductImage, type UnitStatus,
} from './db/schema';
import { CHECKS, GRADES, GRADE_ORDER, isDemo, type GradeKey } from './config';

export type Unit = typeof inventoryUnits.$inferSelect;
export type Inspection = typeof inspections.$inferSelect;
type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];
type Conn = DB | Tx;

export const UNIT_STATUS_LABEL: Record<UnitStatus, string> = {
  intake: 'Intake',
  inspection: 'In inspection',
  refurbishing: 'Refurbishing',
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
  returned: 'Returned',
  rma: 'Repair / RMA',
  hold: 'On hold',
  scrapped: 'Scrapped',
};

/** Moves staff can make. reserved and sold are set only by orders. */
export const STAFF_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  intake: ['inspection', 'hold', 'rma', 'scrapped'],
  inspection: ['refurbishing', 'available', 'hold', 'rma', 'scrapped'],
  refurbishing: ['inspection', 'hold', 'rma', 'scrapped'],
  available: ['inspection', 'refurbishing', 'hold', 'scrapped'],
  reserved: [],
  sold: ['returned'],
  returned: ['inspection', 'refurbishing', 'rma', 'hold', 'scrapped'],
  rma: ['inspection', 'hold', 'scrapped'],
  hold: ['inspection', 'refurbishing', 'available', 'scrapped'],
  scrapped: [],
};

export function newUnitCode() {
  const d = new Date();
  const yymm = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  return `U-${yymm}-${Array.from(crypto.randomBytes(4), (b) => alphabet[b % alphabet.length]).join('')}`;
}

/** What a customer may see about a unit (never the serial number or cost). */
export type PublicUnit = {
  id: string; code: string; productId: string; grade: GradeKey; ramGb: number; ssdGb: number;
  batteryHealth: number | null; batteryCycles: number | null; ssdHealth: number | null;
  colour: string | null; keyboard: string | null; cosmeticNotes: string | null;
  price: number; photos: ProductImage[]; inspectedAt: string | null; listedAt: string | null;
};

/** Units on sale, with their price (unit override or grade price) and last passed inspection date. */
export async function availableUnits(productIds?: string[]): Promise<PublicUnit[]> {
  const d = await db();
  const where = productIds?.length
    ? and(eq(inventoryUnits.status, 'available'), inArray(inventoryUnits.productId, productIds))
    : eq(inventoryUnits.status, 'available');
  const rows = await d.select({
    u: inventoryUnits,
    gradePrice: variants.price,
    inspectedAt: sql<Date | null>`(select max(${inspections.createdAt}) from ${inspections} where ${inspections.unitId} = ${inventoryUnits.id} and ${inspections.passed})`,
  }).from(inventoryUnits)
    .leftJoin(variants, and(eq(variants.productId, inventoryUnits.productId), eq(variants.grade, inventoryUnits.grade), eq(variants.active, true)))
    .where(where);
  return rows
    .filter((r) => (r.u.price ?? r.gradePrice) != null)
    .map(({ u, gradePrice, inspectedAt }) => ({
      id: u.id, code: u.code, productId: u.productId, grade: u.grade as GradeKey, ramGb: u.ramGb, ssdGb: u.ssdGb,
      batteryHealth: u.batteryHealth, batteryCycles: u.batteryCycles, ssdHealth: u.ssdHealth,
      colour: u.colour, keyboard: u.keyboard, cosmeticNotes: u.cosmeticNotes,
      price: (u.price ?? gradePrice) as number, photos: u.photos,
      inspectedAt: inspectedAt ? new Date(inspectedAt).toISOString() : null,
      listedAt: u.listedAt ? u.listedAt.toISOString() : null,
    }))
    .sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade) || a.price - b.price || (b.batteryHealth ?? 0) - (a.batteryHealth ?? 0));
}

export async function latestInspection(unitId: string, conn?: Conn): Promise<Inspection | null> {
  const d = conn ?? (await db());
  const [row] = await d.select().from(inspections).where(eq(inspections.unitId, unitId)).orderBy(desc(inspections.createdAt)).limit(1);
  return row ?? null;
}

export async function logUnit(conn: Conn, unitId: string, kind: string, opts: { from?: string | null; to?: string | null; note?: string | null; by?: string | null } = {}) {
  await conn.insert(unitEvents).values({ unitId, kind, fromStatus: opts.from ?? null, toStatus: opts.to ?? null, note: opts.note ?? null, byUserId: opts.by ?? null });
}

/**
 * Staff status change. Making a unit available requires a passed inspection,
 * measured battery health and a price.
 */
export async function changeUnitStatus(unitId: string, to: UnitStatus, note: string | null, by: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const d = await db();
  return d.transaction(async (tx) => {
    const [u] = await tx.select().from(inventoryUnits).where(eq(inventoryUnits.id, unitId)).for('update').limit(1);
    if (!u) return { ok: false as const, error: 'Unit not found.' };
    if (!STAFF_TRANSITIONS[u.status].includes(to)) return { ok: false as const, error: `A unit that is ${UNIT_STATUS_LABEL[u.status].toLowerCase()} can’t be moved to ${UNIT_STATUS_LABEL[to].toLowerCase()}.` };
    if (to === 'available') {
      const insp = await latestInspection(unitId, tx);
      if (!insp?.passed) return { ok: false as const, error: 'Record a passed inspection before listing this unit.' };
      if (u.batteryHealth == null) return { ok: false as const, error: 'Enter the measured battery health before listing.' };
      const [v] = await tx.select().from(variants).where(and(eq(variants.productId, u.productId), eq(variants.grade, u.grade))).limit(1);
      if (u.price == null && !v?.active) return { ok: false as const, error: 'Set a price for this grade (or for the unit) before listing.' };
      const min = GRADES[u.grade as GradeKey]?.batteryMin;
      if (min && u.batteryHealth < min) return { ok: false as const, error: `Battery health ${u.batteryHealth}% is below the ${GRADES[u.grade as GradeKey].label} minimum of ${min}%. Change the grade or replace the battery.` };
    }
    await tx.update(inventoryUnits).set({
      status: to, updatedAt: new Date(),
      ...(to === 'available' && !u.listedAt ? { listedAt: new Date() } : {}),
    }).where(eq(inventoryUnits.id, unitId));
    await logUnit(tx, unitId, 'status', { from: u.status, to, note, by });
    return { ok: true as const };
  });
}

/** Reserves units for a new order. Throws SOLD_OUT if any unit was taken first. */
export async function reserveUnits(tx: Tx, unitIds: string[], orderId: string, holdUntil: Date | null) {
  if (!unitIds.length) return;
  const res = await tx.update(inventoryUnits)
    .set({ status: 'reserved', orderId, reservedUntil: holdUntil, updatedAt: new Date() })
    .where(and(inArray(inventoryUnits.id, unitIds), eq(inventoryUnits.status, 'available')))
    .returning({ id: inventoryUnits.id });
  if (res.length !== unitIds.length) throw new Error('SOLD_OUT');
  for (const id of unitIds) await logUnit(tx, id, 'status', { from: 'available', to: 'reserved', note: 'Reserved by an order' });
}

/** Payment confirmed (or pay-on-delivery accepted): reserved units become sold. */
export async function sellUnits(tx: Tx, orderId: string) {
  const res = await tx.update(inventoryUnits).set({ status: 'sold', soldAt: new Date(), reservedUntil: null, updatedAt: new Date() })
    .where(and(eq(inventoryUnits.orderId, orderId), eq(inventoryUnits.status, 'reserved'))).returning({ id: inventoryUnits.id });
  for (const r of res) await logUnit(tx, r.id, 'status', { from: 'reserved', to: 'sold', note: 'Order confirmed' });
}

/** Order cancelled before dispatch: its units go back on sale. */
export async function releaseUnits(tx: Tx, orderId: string, note: string) {
  const res = await tx.update(inventoryUnits).set({ status: 'available', orderId: null, reservedUntil: null, soldAt: null, updatedAt: new Date() })
    .where(and(eq(inventoryUnits.orderId, orderId), inArray(inventoryUnits.status, ['reserved', 'sold']))).returning({ id: inventoryUnits.id });
  for (const r of res) await logUnit(tx, r.id, 'status', { to: 'available', note });
}

/** A unit came back from a customer; it must be inspected before it can be sold again. */
export async function markUnitReturned(conn: Conn, unitId: string, note: string, by: string | null) {
  const [u] = await conn.update(inventoryUnits).set({ status: 'returned', orderId: null, updatedAt: new Date() })
    .where(and(eq(inventoryUnits.id, unitId), eq(inventoryUnits.status, 'sold'))).returning({ id: inventoryUnits.id });
  if (u) await logUnit(conn, unitId, 'status', { from: 'sold', to: 'returned', note, by });
}

/* ── Setup helpers ─────────────────────────────────────────── */

type Manifest = { models: Record<string, { credit: string; images: { src: string; width: number; height: number }[] }> };

export function manufacturerPhotos(): Manifest['models'] {
  try {
    const file = path.join(process.cwd(), 'public', 'products', 'manifest.json');
    return (JSON.parse(fs.readFileSync(file, 'utf8')) as Manifest).models;
  } catch {
    return {};
  }
}

/** Fills in official photos for models that have none (staff uploads always win). */
export async function syncManufacturerPhotos(d: DB) {
  const photos = manufacturerPhotos();
  const rows = await d.select({ id: products.id, title: products.title, images: products.images }).from(products);
  for (const p of rows) {
    const m = photos[p.id];
    if (!m || p.images.length) continue;
    await d.update(products).set({
      images: m.images.map((i, n) => ({ src: i.src, width: i.width, height: i.height, alt: `${p.title}${n ? `, view ${n + 1}` : ''} (official photo)` })),
    }).where(eq(products.id, p.id));
  }
}

const COSMETIC: Record<GradeKey, string[]> = {
  pristine: ['No visible marks.', 'No visible marks; palm rest like new.', 'Lid and base without marks.'],
  excellent: ['Two hairline marks on the lid, visible up close.', 'Light wear on the palm rest.', 'A faint scuff near a hinge.', 'Small hairline scratch on the base.'],
  good: ['Scuffs on the lid corners and a small dent on the base edge.', 'Visible scratches on the lid; some keyboard shine.', 'Worn palm rest and marks on the base.', 'A dent on the lid corner; screen unaffected.'],
};
const COLOUR: Record<string, string> = { black: 'Black', silver: 'Silver', graphite: 'Grey', 'space-grey': 'Space grey', midnight: 'Midnight', starlight: 'Starlight' };

/**
 * Demo mode only: creates sample units (serials start with DEMO-) so the store can be tried
 * end to end. Never runs in production unless DEMO_MODE=1.
 */
export async function ensureDemoInventory(d: DB) {
  if (!isDemo()) return;
  const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(inventoryUnits);
  if (n > 0) return;
  const ps = await d.select().from(products).orderBy(products.sort);
  const vs = await d.select().from(variants);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const allChecks: InspectionCheck[] = CHECKS.flatMap((g) => g.items.map((item) => ({ group: g.group, item, result: 'pass' as const })));
  await d.transaction(async (tx) => {
    for (const [i, p] of ps.entries()) {
      for (const [gi, g] of GRADE_ORDER.entries()) {
        const v = vs.find((x) => x.productId === p.id && x.grade === g);
        if (!v) continue;
        const count = ((i + 3) * 37 + gi * 11) % 9 === 0 ? 0 : Math.min(4, ((i + 3) * 37 + gi * 11) % 9);
        for (let k = 0; k < count; k++) {
          const min = GRADES[g].batteryMin;
          const battery = Math.min(100, min + Math.round(rnd() * (99 - min)));
          const ssd = 92 + Math.round(rnd() * 8);
          const cycles = 30 + Math.round(rnd() * (g === 'good' ? 520 : 300));
          const listed = new Date(Date.now() - Math.round(rnd() * 40) * 86_400_000);
          const [u] = await tx.insert(inventoryUnits).values({
            code: newUnitCode(), productId: p.id, grade: g,
            serialNumber: `DEMO-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
            status: 'available', ramGb: p.ramGb, ssdGb: p.ssdGb,
            batteryHealth: battery, batteryCycles: cycles, ssdHealth: ssd,
            colour: COLOUR[p.art.colour] ?? null,
            keyboard: p.brand === 'Apple' ? 'US English' : 'US English, backlit',
            cosmeticNotes: COSMETIC[g][Math.floor(rnd() * COSMETIC[g].length)],
            internalNotes: 'Demo unit created automatically.',
            purchaseCost: Math.round((v.price * (0.55 + rnd() * 0.12)) / 100) * 100,
            purchaseSource: 'Demo supplier', location: ['Gurgaon · Rack A', 'Gurgaon · Rack B', 'Bengaluru · Rack 1'][Math.floor(rnd() * 3)],
            listedAt: listed, createdAt: listed, purchasedAt: new Date(listed.getTime() - 5 * 86_400_000),
          }).returning();
          await tx.insert(inspections).values({
            unitId: u.id, inspectorName: 'Demo bench', passed: true, batteryHealth: battery, batteryCycles: cycles, ssdHealth: ssd,
            checks: allChecks, summary: `All ${allChecks.length} checks passed. Battery ${battery}% of design capacity, SSD ${ssd}% health.`, createdAt: listed,
          });
          await logUnit(tx, u.id, 'created', { to: 'available', note: 'Demo unit' });
        }
      }
    }
  });
}
