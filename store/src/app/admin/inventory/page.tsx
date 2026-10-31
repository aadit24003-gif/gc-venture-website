import Link from 'next/link';
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { Plus } from 'lucide-react';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { inventoryUnits, products, variants, UNIT_STATUSES, type UnitStatus } from '@/lib/db/schema';
import { UNIT_STATUS_LABEL } from '@/lib/inventory';
import { GRADES, GRADE_ORDER, type GradeKey } from '@/lib/config';
import { formatDate, gb, rupees } from '@/lib/format';
import { Filters, PageHead, Pager, Table, td } from '../ui';

export const metadata = { title: 'Inventory' };
const PER = 50;
const TONE: Record<string, string> = { available: 'ok', reserved: 'info', sold: 'done', intake: 'wait', inspection: 'wait', refurbishing: 'wait', returned: 'bad', rma: 'bad', hold: 'done', scrapped: 'done' };

export default async function Inventory({ searchParams }: { searchParams: Promise<{ status?: string; product?: string; grade?: string; q?: string; page?: string }> }) {
  const v = await requireStaff('inventory.manage');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const conds: SQL[] = [];
  if (sp.status === 'workshop') conds.push(inArray(inventoryUnits.status, ['intake', 'inspection', 'refurbishing']));
  else if (sp.status && (UNIT_STATUSES as readonly string[]).includes(sp.status)) conds.push(eq(inventoryUnits.status, sp.status as UnitStatus));
  if (sp.product) conds.push(eq(inventoryUnits.productId, sp.product));
  if (sp.grade && sp.grade in GRADES) conds.push(eq(inventoryUnits.grade, sp.grade));
  const q = (sp.q ?? '').trim();
  if (q) conds.push(or(ilike(inventoryUnits.code, `%${q}%`), ilike(inventoryUnits.serialNumber, `%${q}%`), ilike(inventoryUnits.location, `%${q}%`))!);
  const where = conds.length ? and(...conds) : undefined;
  const d = await db();
  const [[{ n }], rows, counts, models] = await Promise.all([
    d.select({ n: sql<number>`count(*)::int` }).from(inventoryUnits).where(where),
    d.select({ u: inventoryUnits, title: products.title, gradePrice: variants.price }).from(inventoryUnits)
      .innerJoin(products, eq(products.id, inventoryUnits.productId))
      .leftJoin(variants, and(eq(variants.productId, inventoryUnits.productId), eq(variants.grade, inventoryUnits.grade)))
      .where(where).orderBy(desc(inventoryUnits.updatedAt)).limit(PER).offset((page - 1) * PER),
    d.select({ status: inventoryUnits.status, n: sql<number>`count(*)::int` }).from(inventoryUnits).groupBy(inventoryUnits.status),
    d.select({ id: products.id, title: products.title }).from(products).orderBy(products.title),
  ]);
  const cnt = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const showCost = v.can('inventory.cost');
  return (
    <div>
      <PageHead title="Inventory units" intro="Every physical laptop, from intake to sale. A unit goes on sale only after a passed inspection, with its battery measured and a price." actions={<Link href="/admin/inventory/new" className="btn btn-primary btn-sm"><Plus size={15} /> Receive a unit</Link>} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/admin/inventory" className="chip !min-h-8 !text-[13px]" aria-current={!sp.status ? 'page' : undefined}>All {counts.reduce((a, c) => a + c.n, 0)}</Link>
        <Link href="/admin/inventory?status=workshop" className="chip !min-h-8 !text-[13px]" aria-current={sp.status === 'workshop' ? 'page' : undefined}>In workshop {cnt('intake') + cnt('inspection') + cnt('refurbishing')}</Link>
        {UNIT_STATUSES.filter((s) => cnt(s)).map((s) => <Link key={s} href={`/admin/inventory?status=${s}`} className="chip !min-h-8 !text-[13px]" aria-current={sp.status === s ? 'page' : undefined}>{UNIT_STATUS_LABEL[s]} {cnt(s)}</Link>)}
      </div>
      <Filters action="/admin/inventory">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <label className="text-[12.5px] text-mute">Search<input name="q" defaultValue={q} placeholder="Unit code, serial, location" className="field !min-h-9 w-[230px] text-[13.5px]" /></label>
        <label className="text-[12.5px] text-mute">Model<select name="product" defaultValue={sp.product ?? ''} className="field !min-h-9 max-w-[260px] text-[13.5px]"><option value="">Any</option>{models.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
        <label className="text-[12.5px] text-mute">Grade<select name="grade" defaultValue={sp.grade ?? ''} className="field !min-h-9 text-[13.5px]"><option value="">Any</option>{GRADE_ORDER.map((g) => <option key={g} value={g}>{GRADES[g].label}</option>)}</select></label>
      </Filters>
      <Table head={['Unit', 'Model', 'Grade', 'Config', 'Battery', 'Price', ...(showCost ? ['Cost'] : []), 'Status', 'Location', 'Updated']} empty={rows.length ? false : 'No units match.'}>
        {rows.map(({ u, title, gradePrice }) => (
          <tr key={u.id} className="hover:bg-canvas/50">
            <td className={td}><Link href={`/admin/inventory/${u.code}`} className="mono font-semibold hover:underline">{u.code}</Link><br /><span className="mono text-[11.5px] text-mute">{u.serialNumber}</span></td>
            <td className={td}>{title}</td>
            <td className={td}>{GRADES[u.grade as GradeKey]?.label}</td>
            <td className={`${td} whitespace-nowrap`}>{gb(u.ramGb)} · {gb(u.ssdGb)}</td>
            <td className={`${td} mono`}>{u.batteryHealth != null ? `${u.batteryHealth}%` : '—'}</td>
            <td className={`${td} mono`}>{u.price != null ? <>{rupees(u.price)}<span className="block text-[11px] text-mute">override</span></> : gradePrice != null ? rupees(gradePrice) : '—'}</td>
            {showCost && <td className={`${td} mono`}>{u.purchaseCost != null ? rupees(u.purchaseCost) : '—'}</td>}
            <td className={td}><span className={`pill pill-${TONE[u.status]}`}>{UNIT_STATUS_LABEL[u.status]}</span></td>
            <td className={`${td} text-mute`}>{u.location ?? '—'}</td>
            <td className={`${td} whitespace-nowrap text-mute`}>{formatDate(u.updatedAt)}</td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil(n / PER)} base="/admin/inventory" params={{ status: sp.status, product: sp.product, grade: sp.grade, q }} />
    </div>
  );
}
