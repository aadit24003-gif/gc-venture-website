import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { BadgeCheck, CircleSlash, Wrench, XCircle } from 'lucide-react';
import { db } from '@/lib/db';
import { inspections, inventoryUnits, products, unitParts, variants } from '@/lib/db/schema';
import { GRADES, type GradeKey } from '@/lib/config';
import { formatDate, gb, rupees } from '@/lib/format';
import ProductImage from '@/components/ui/ProductImage';
import { GradeBadge, Meter } from '@/components/ui/bits';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ code: string }> };

async function load(code: string) {
  if (!/^U-[\w-]{4,20}$/.test(code)) return null;
  const d = await db();
  const [row] = await d.select({ u: inventoryUnits, p: products }).from(inventoryUnits).innerJoin(products, eq(products.id, inventoryUnits.productId)).where(eq(inventoryUnits.code, code)).limit(1);
  if (!row || ['intake', 'scrapped'].includes(row.u.status)) return null;
  const [insp, parts, [v]] = await Promise.all([
    d.select().from(inspections).where(eq(inspections.unitId, row.u.id)).orderBy(desc(inspections.createdAt)).limit(1),
    d.select({ part: unitParts.part, detail: unitParts.detail, createdAt: unitParts.createdAt }).from(unitParts).where(eq(unitParts.unitId, row.u.id)).orderBy(unitParts.createdAt),
    d.select().from(variants).where(eq(variants.productId, row.p.id)),
  ]);
  return { ...row, inspection: insp[0] ?? null, parts, price: row.u.price ?? v?.price ?? null };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await load((await params).code);
  return r ? { title: `Inspection report ${r.u.code}: ${r.p.title}`, robots: { index: false } } : { title: 'Report not found' };
}

export default async function UnitReport({ params }: Props) {
  const r = await load((await params).code);
  if (!r) notFound();
  const { u, p, inspection: insp, parts } = r;
  const grade = u.grade as GradeKey;
  const groups = insp ? [...new Set(insp.checks.map((c) => c.group))] : [];
  const passed = insp ? insp.checks.filter((c) => c.result === 'pass').length : 0;
  const onSale = u.status === 'available';
  return (
    <div className="wrap max-w-[1000px] pb-16 pt-10">
      <p className="eyebrow">Inspection report</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] md:text-[44px]">{p.title}</h1>
          <p className="mono mt-2 text-[14px] text-mute">Unit {u.code} · serial ending {u.serialNumber.slice(-4)}</p>
        </div>
        <span className={`pill ${onSale ? 'pill-ok' : 'pill-done'} !h-8 !px-3 !text-[13px]`}>{onSale ? 'On sale' : u.status === 'reserved' ? 'Reserved' : 'Sold'}</span>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.3fr]">
        <div className="well aspect-[4/3] rounded-card border border-line p-6"><ProductImage image={p.images[0]} art={p.art} brand={p.brand} slug={p.slug} title={p.title} /></div>
        <div className="cert p-6" style={{ ['--cert-bg' as string]: '#fff' }}>
          <div className="flex items-start justify-between gap-3">
            <div><GradeBadge grade={grade} /><p className="mt-2 text-[14px] text-mute">{GRADES[grade].body}</p></div>
            {insp && <div className="seal shrink-0" aria-label={`${passed} of ${insp.checks.length} checks passed`}>{passed}/{insp.checks.length}<br />{insp.passed ? 'PASSED' : 'FAILED'}</div>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-5">
            <Meter value={u.batteryHealth} label="Battery health" min={GRADES[grade].batteryMin} />
            <Meter value={u.ssdHealth} label="SSD health" />
          </div>
          <div className="perf my-5" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13.5px]">
            {[['Memory', gb(u.ramGb)], ['Storage', `${gb(u.ssdGb)} SSD`], ['Charge cycles', u.batteryCycles ?? '—'], ['Colour', u.colour ?? '—'], ['Keyboard', u.keyboard ?? '—'], ['Inspected', insp ? formatDate(insp.createdAt) : '—']].map(([k, v]) => (
              <div key={k as string}><dt className="text-mute">{k}</dt><dd className="mono mt-0.5">{v}</dd></div>
            ))}
          </dl>
          {u.cosmeticNotes && <p className="mt-5 rounded-xl bg-canvas p-3 text-[14px]"><b>Cosmetic notes:</b> {u.cosmeticNotes}</p>}
          {onSale && r.price != null && <Link href={`/laptops/${p.slug}?unit=${u.code}`} className="btn btn-primary mt-5 w-full">Buy this unit · {rupees(r.price)}</Link>}
        </div>
      </div>

      {parts.length > 0 && (
        <section className="mt-10" aria-labelledby="parts-h">
          <h2 id="parts-h" className="text-[24px]">Parts replaced</h2>
          <ul className="mt-4 space-y-2">
            {parts.map((x, i) => <li key={i} className="flex gap-3 rounded-xl border border-line bg-white p-4 text-[14.5px]"><Wrench size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span><b>{x.part}</b>{x.detail ? ` · ${x.detail}` : ''} <span className="text-mute">({formatDate(x.createdAt)})</span></span></li>)}
          </ul>
        </section>
      )}

      {insp ? (
        <section className="mt-10" aria-labelledby="checks-h">
          <h2 id="checks-h" className="text-[24px]">Every check</h2>
          {insp.summary && <p className="mt-2 text-mute">{insp.summary}</p>}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {groups.map((g) => (
              <div key={g} className="rounded-card border border-line bg-white p-5">
                <p className="font-semibold">{g}</p>
                <ul className="mt-3 space-y-2 text-[14px]">
                  {insp.checks.filter((c) => c.group === g).map((c) => (
                    <li key={c.item} className="flex gap-2">
                      {c.result === 'pass' ? <BadgeCheck size={17} className="mt-0.5 shrink-0 text-ok" aria-label="Passed" /> : c.result === 'fail' ? <XCircle size={17} className="mt-0.5 shrink-0 text-bad" aria-label="Failed" /> : <CircleSlash size={17} className="mt-0.5 shrink-0 text-faint" aria-label="Not applicable" />}
                      <span>{c.item}{c.note ? <span className="text-mute"> · {c.note}</span> : null}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-mute">Inspected by {insp.inspectorName} on {formatDate(insp.createdAt, true)}. Re-checked again after an order, before dispatch.</p>
        </section>
      ) : <p className="mt-10 text-mute">This unit’s inspection is still in progress.</p>}
    </div>
  );
}
