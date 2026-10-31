/** Editable pages and blog posts. */
import { and, desc, eq, lte } from 'drizzle-orm';
import { db } from './db';
import { pages, posts } from './db/schema';
import { BRAND, POLICY, STUDENT } from './config';
import { getSettings } from './settings';
import { rupees } from './format';

export type Page = typeof pages.$inferSelect;
export type Post = typeof posts.$inferSelect;

/** Values for {{placeholders}} in pages, from settings and config. */
export async function pageVars(): Promise<Record<string, string>> {
  const s = await getSettings();
  const ext = POLICY.warrantyExtensions.find((w) => w.price > 0);
  const ship = s.shipping;
  return {
    brand: BRAND.name,
    legal_name: s.business.legalName,
    gstin_clause: s.business.gstin ? ` (GSTIN ${s.business.gstin})` : '',
    registered_address: s.business.registeredAddress,
    support_email: s.business.email,
    support_phone: s.business.phone,
    hours: s.business.hours,
    grievance_officer: s.business.grievanceName ? `, ${s.business.grievanceName},` : '',
    grievance_email: s.business.grievanceEmail,
    return_days: String(POLICY.returnDays),
    warranty_months: String(POLICY.warrantyMonths),
    extension_clause: ext ? `, or ${ext.months} months if you added the extension (${rupees(ext.price)}) at checkout` : '',
    student_percent: String(STUDENT.percent),
    student_months: String(STUDENT.validityMonths),
    student_units: STUDENT.maxUnitsPerOrder === 1 ? 'one laptop' : `${STUDENT.maxUnitsPerOrder} laptops`,
    id_retention_days: String(STUDENT.idRetentionDays),
    dispatch_min: String(ship.dispatchMin),
    dispatch_max: String(ship.dispatchMax),
    shipping_clause: ship.flatFee === 0 ? 'Delivery is free.' : ship.freeAbove > 0 ? `Delivery costs ${rupees(ship.flatFee)}, and is free on orders over ${rupees(ship.freeAbove)}.` : `Delivery costs ${rupees(ship.flatFee)}.`,
    cod_clause: ship.codEnabled ? `Pay on delivery is available for orders up to ${rupees(ship.codMax)}${ship.codFee ? ` for a ${rupees(ship.codFee)} handling fee` : ', at no extra cost'}.` : 'Pay on delivery is not available at the moment.',
  };
}

export const fill = (text: string, vars: Record<string, string>) => text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => vars[k] ?? m);

export async function getPage(slug: string) {
  const d = await db();
  const [p] = await d.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (!p) return null;
  const vars = await pageVars();
  return { ...p, title: fill(p.title, vars), summary: p.summary ? fill(p.summary, vars) : null, body: fill(p.body, vars) };
}

export async function publishedPosts(limit = 50) {
  const d = await db();
  return d.select().from(posts).where(and(eq(posts.status, 'published'), lte(posts.publishedAt, new Date()))).orderBy(desc(posts.publishedAt)).limit(limit);
}

export async function postBySlug(slug: string) {
  const d = await db();
  const [p] = await d.select().from(posts).where(eq(posts.slug, slug)).limit(1);
  return p ?? null;
}
