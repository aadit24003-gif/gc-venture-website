'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { inspections, inventoryUnits, products, unitParts, UNIT_STATUSES, type InspectionCheck } from '@/lib/db/schema';
import { staffCan } from '@/lib/auth/session';
import { changeUnitStatus, logUnit, newUnitCode } from '@/lib/inventory';
import { invalidateProducts } from '@/lib/products';
import { audit } from '@/lib/audit';
import { GRADES } from '@/lib/config';

type R = { ok: true; message?: string; code?: string } | { ok: false; error: string };
const deny: R = { ok: false, error: 'Your role can’t do that.' };
const money = z.number().min(0).max(10_00_000).nullable(); // rupees
const pct = z.number().int().min(0).max(100).nullable();

const UnitInput = z.object({
  productId: z.string().min(1),
  grade: z.enum(['pristine', 'excellent', 'good']),
  serialNumber: z.string().trim().min(3, 'Enter the serial number or service tag.').max(60),
  ramGb: z.number().int().min(2).max(128),
  ssdGb: z.number().int().min(64).max(8192),
  batteryHealth: pct,
  batteryCycles: z.number().int().min(0).max(5000).nullable(),
  ssdHealth: pct,
  colour: z.string().trim().max(30).nullable(),
  keyboard: z.string().trim().max(60).nullable(),
  cosmeticNotes: z.string().trim().max(400).nullable(),
  internalNotes: z.string().trim().max(1000).nullable(),
  price: money,
  purchaseCost: money,
  purchaseSource: z.string().trim().max(80).nullable(),
  purchaseRef: z.string().trim().max(80).nullable(),
  purchasedAt: z.string().nullable(),
  location: z.string().trim().max(60).nullable(),
});
export type UnitForm = z.input<typeof UnitInput>;

const toRow = (u: z.infer<typeof UnitInput>, canCost: boolean) => ({
  productId: u.productId, grade: u.grade, serialNumber: u.serialNumber.toUpperCase(), ramGb: u.ramGb, ssdGb: u.ssdGb,
  batteryHealth: u.batteryHealth, batteryCycles: u.batteryCycles, ssdHealth: u.ssdHealth,
  colour: u.colour || null, keyboard: u.keyboard || null, cosmeticNotes: u.cosmeticNotes || null, internalNotes: u.internalNotes || null,
  price: u.price != null ? Math.round(u.price * 100) : null, location: u.location || null,
  ...(canCost ? {
    purchaseCost: u.purchaseCost != null ? Math.round(u.purchaseCost * 100) : null, purchaseSource: u.purchaseSource || null, purchaseRef: u.purchaseRef || null,
    purchasedAt: u.purchasedAt ? new Date(`${u.purchasedAt}T12:00:00+05:30`) : null,
  } : {}),
});

export async function createUnit(input: UnitForm): Promise<R> {
  const v = await staffCan('inventory.manage');
  if (!v) return deny;
  const p = UnitInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const d = await db();
  const [prod] = await d.select({ id: products.id }).from(products).where(eq(products.id, p.data.productId)).limit(1);
  if (!prod) return { ok: false, error: 'Choose a laptop model.' };
  const [dup] = await d.select({ code: inventoryUnits.code }).from(inventoryUnits).where(eq(inventoryUnits.serialNumber, p.data.serialNumber.toUpperCase())).limit(1);
  if (dup) return { ok: false, error: `That serial is already unit ${dup.code}.` };
  const code = newUnitCode();
  const [u] = await d.insert(inventoryUnits).values({ code, status: 'intake', ...toRow(p.data, v.can('inventory.cost')) }).returning();
  await logUnit(d, u.id, 'created', { to: 'intake', note: 'Received', by: v.user.id });
  await audit(v, 'unit.create', 'unit', code, { productId: u.productId, serial: u.serialNumber });
  revalidatePath('/admin/inventory');
  return { ok: true, code, message: `Unit ${code} added. Next: inspect it.` };
}

export async function updateUnit(code: string, input: UnitForm): Promise<R> {
  const v = await staffCan('inventory.manage');
  if (!v) return deny;
  const p = UnitInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const d = await db();
  const [u] = await d.select().from(inventoryUnits).where(eq(inventoryUnits.code, code)).limit(1);
  if (!u) return { ok: false, error: 'Unit not found.' };
  if (['reserved', 'sold'].includes(u.status) && (p.data.price !== (u.price == null ? null : u.price / 100) || p.data.grade !== u.grade)) {
    return { ok: false, error: 'This unit is in an order; its grade and price can’t change now.' };
  }
  const row = toRow(p.data, v.can('inventory.cost'));
  if (u.status === 'available' && row.batteryHealth != null && row.batteryHealth < GRADES[row.grade].batteryMin) {
    return { ok: false, error: `Battery ${row.batteryHealth}% is below the ${GRADES[row.grade].label} minimum (${GRADES[row.grade].batteryMin}%). Change the grade or take it off sale first.` };
  }
  const [dup] = await d.select({ code: inventoryUnits.code }).from(inventoryUnits).where(eq(inventoryUnits.serialNumber, row.serialNumber)).limit(1);
  if (dup && dup.code !== code) return { ok: false, error: `That serial is already unit ${dup.code}.` };
  await d.update(inventoryUnits).set({ ...row, updatedAt: new Date() }).where(eq(inventoryUnits.id, u.id));
  const changed = Object.entries(row).filter(([k, val]) => String((u as Record<string, unknown>)[k] ?? '') !== String(val ?? '')).map(([k]) => k);
  if (changed.length) await logUnit(d, u.id, changed.includes('price') ? 'price' : 'edit', { note: `Changed ${changed.join(', ')}`, by: v.user.id });
  await audit(v, 'unit.update', 'unit', code, { changed });
  invalidateProducts();
  revalidatePath(`/admin/inventory/${code}`);
  return { ok: true, message: 'Saved.' };
}

export async function moveUnit(code: string, to: string, note: string): Promise<R> {
  const v = await staffCan('inventory.manage');
  if (!v) return deny;
  if (!(UNIT_STATUSES as readonly string[]).includes(to)) return { ok: false, error: 'Unknown status.' };
  const d = await db();
  const [u] = await d.select({ id: inventoryUnits.id }).from(inventoryUnits).where(eq(inventoryUnits.code, code)).limit(1);
  if (!u) return { ok: false, error: 'Unit not found.' };
  const r = await changeUnitStatus(u.id, to as (typeof UNIT_STATUSES)[number], note || null, v.user.id);
  if (!r.ok) return r;
  await audit(v, 'unit.status', 'unit', code, { to, note });
  invalidateProducts();
  revalidatePath(`/admin/inventory/${code}`);
  return { ok: true, message: to === 'available' ? 'Listed: it’s now on sale.' : 'Status changed.' };
}

const Insp = z.object({
  inspectorName: z.string().trim().min(2, 'Enter who inspected it.').max(60),
  batteryHealth: pct,
  batteryCycles: z.number().int().min(0).max(5000).nullable(),
  ssdHealth: pct,
  checks: z.array(z.object({ group: z.string(), item: z.string(), result: z.enum(['pass', 'fail', 'na']), note: z.string().max(200).nullable().optional() })).min(1),
  summary: z.string().trim().max(600).nullable(),
});

/** Records a bench inspection. Measured values are copied onto the unit. */
export async function recordInspection(code: string, input: z.input<typeof Insp>): Promise<R> {
  const v = await staffCan('inventory.manage');
  if (!v) return deny;
  const p = Insp.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const d = await db();
  const [u] = await d.select().from(inventoryUnits).where(eq(inventoryUnits.code, code)).limit(1);
  if (!u) return { ok: false, error: 'Unit not found.' };
  const passed = !p.data.checks.some((c) => c.result === 'fail');
  await d.insert(inspections).values({
    unitId: u.id, inspectorId: v.user.id, inspectorName: p.data.inspectorName, passed,
    batteryHealth: p.data.batteryHealth, batteryCycles: p.data.batteryCycles, ssdHealth: p.data.ssdHealth,
    checks: p.data.checks as InspectionCheck[], summary: p.data.summary || null,
  });
  await d.update(inventoryUnits).set({
    batteryHealth: p.data.batteryHealth ?? u.batteryHealth, batteryCycles: p.data.batteryCycles ?? u.batteryCycles, ssdHealth: p.data.ssdHealth ?? u.ssdHealth,
    status: u.status === 'intake' ? 'inspection' : u.status, updatedAt: new Date(),
  }).where(eq(inventoryUnits.id, u.id));
  const fails = p.data.checks.filter((c) => c.result === 'fail').length;
  await logUnit(d, u.id, 'inspection', { from: u.status, to: u.status === 'intake' ? 'inspection' : u.status, note: passed ? `Passed ${p.data.checks.length} checks` : `${fails} check(s) failed`, by: v.user.id });
  await audit(v, 'unit.inspection', 'unit', code, { passed, fails });
  invalidateProducts();
  revalidatePath(`/admin/inventory/${code}`);
  return { ok: true, message: passed ? 'Inspection passed. You can list the unit now.' : `${fails} check(s) failed. Refurbish and inspect again.` };
}

export async function addPart(code: string, input: { part: string; detail: string; cost: number | null }): Promise<R> {
  const v = await staffCan('inventory.manage');
  if (!v) return deny;
  const part = input.part.trim();
  if (part.length < 2) return { ok: false, error: 'Name the part.' };
  const d = await db();
  const [u] = await d.select().from(inventoryUnits).where(eq(inventoryUnits.code, code)).limit(1);
  if (!u) return { ok: false, error: 'Unit not found.' };
  await d.insert(unitParts).values({ unitId: u.id, part: part.slice(0, 60), detail: input.detail.trim().slice(0, 200) || null, cost: v.can('inventory.cost') && input.cost != null ? Math.round(input.cost * 100) : null, byUserId: v.user.id });
  await logUnit(d, u.id, 'part', { note: `Replaced ${part}`, by: v.user.id });
  await audit(v, 'unit.part', 'unit', code, { part });
  revalidatePath(`/admin/inventory/${code}`);
  return { ok: true, message: 'Part logged.' };
}
