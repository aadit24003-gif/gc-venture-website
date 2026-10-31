import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { inspections, inventoryUnits, orders, products, unitEvents, unitParts, users, variants } from '@/lib/db/schema';
import { STAFF_TRANSITIONS, UNIT_STATUS_LABEL } from '@/lib/inventory';
import { CHECKS, GRADES, type GradeKey } from '@/lib/config';
import { formatDate, rupees } from '@/lib/format';
import { PageHead, Panel } from '../../ui';
import UnitForm from '../UnitForm';
import { InspectionForm, PartForm, StatusMover } from './UnitTools';

export default async function UnitPage({ params }: { params: Promise<{ code: string }> }) {
  const v = await requireStaff('inventory.manage');
  const { code } = await params;
  const d = await db();
  const [row] = await d.select({ u: inventoryUnits, p: products }).from(inventoryUnits).innerJoin(products, eq(products.id, inventoryUnits.productId)).where(eq(inventoryUnits.code, code)).limit(1);
  if (!row) notFound();
  const { u, p } = row;
  const [insps, parts, events, models, vs, order] = await Promise.all([
    d.select().from(inspections).where(eq(inspections.unitId, u.id)).orderBy(desc(inspections.createdAt)),
    d.select().from(unitParts).where(eq(unitParts.unitId, u.id)).orderBy(desc(unitParts.createdAt)),
    d.select({ e: unitEvents, by: users.name }).from(unitEvents).leftJoin(users, eq(users.id, unitEvents.byUserId)).where(eq(unitEvents.unitId, u.id)).orderBy(desc(unitEvents.createdAt)),
    d.select({ id: products.id, title: products.title, ramGb: products.ramGb, ssdGb: products.ssdGb }).from(products).orderBy(products.title),
    d.select().from(variants).where(eq(variants.productId, p.id)),
    u.orderId ? d.select({ number: orders.number, status: orders.status }).from(orders).where(eq(orders.id, u.orderId)).limit(1) : Promise.resolve([]),
  ]);
  const gradePrice = vs.find((x) => x.grade === u.grade)?.price ?? null;
  const last = insps[0];
  const locked = ['reserved', 'sold'].includes(u.status);
  const canCost = v.can('inventory.cost');
  return (
    <div>
      <PageHead back={{ href: '/admin/inventory', label: 'Inventory' }} title={`${u.code} · ${p.title}`}
        intro={<span className="flex flex-wrap items-center gap-2"><span className="pill pill-info">{UNIT_STATUS_LABEL[u.status]}</span><span className="mono">Serial {u.serialNumber}</span><span>· {GRADES[u.grade as GradeKey]?.label}</span><span>· {u.price != null ? `${rupees(u.price)} (override)` : gradePrice != null ? `${rupees(gradePrice)} (grade price)` : 'no price'}</span>{order[0] && <Link href={`/admin/orders/${order[0].number}`} className="underline">order {order[0].number}</Link>}</span>}
        actions={<><Link href={`/units/${u.code}`} className="btn btn-ghost btn-sm" target="_blank">Public report</Link><Link href={`/admin/products/${p.id}`} className="btn btn-ghost btn-sm">Model</Link></>} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel title="Details">
            <UnitForm code={u.code} models={models} canCost={canCost} locked={locked} initial={{
              productId: u.productId, grade: u.grade as GradeKey, serialNumber: u.serialNumber, ramGb: u.ramGb, ssdGb: u.ssdGb, batteryHealth: u.batteryHealth, batteryCycles: u.batteryCycles, ssdHealth: u.ssdHealth,
              colour: u.colour, keyboard: u.keyboard, cosmeticNotes: u.cosmeticNotes, internalNotes: u.internalNotes, price: u.price != null ? u.price / 100 : null,
              purchaseCost: canCost && u.purchaseCost != null ? u.purchaseCost / 100 : null, purchaseSource: canCost ? u.purchaseSource : null, purchaseRef: canCost ? u.purchaseRef : null,
              purchasedAt: canCost && u.purchasedAt ? u.purchasedAt.toISOString().slice(0, 10) : null, location: u.location,
            }} />
          </Panel>
          <Panel title="Record an inspection">
            <p className="mb-4 text-[13.5px] text-mute">{last ? `Last inspected ${formatDate(last.createdAt, true)} by ${last.inspectorName}: ${last.passed ? 'passed' : 'failed'}.` : 'Not inspected yet.'} Every check defaults to Pass; mark anything else.</p>
            <InspectionForm code={u.code} checks={CHECKS} defaults={{ inspector: v.user.name ?? '', battery: u.batteryHealth, cycles: u.batteryCycles, ssd: u.ssdHealth }} />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Status"><StatusMover code={u.code} moves={STAFF_TRANSITIONS[u.status]} /></Panel>
          <Panel title="Parts replaced">
            <PartForm code={u.code} canCost={canCost} />
            {parts.length > 0 && <ul className="mt-4 divide-y divide-line text-[13.5px]">{parts.map((x) => <li key={x.id} className="flex justify-between gap-3 py-2"><span><b>{x.part}</b>{x.detail ? ` · ${x.detail}` : ''}</span><span className="text-mute">{canCost && x.cost != null ? `${rupees(x.cost)} · ` : ''}{formatDate(x.createdAt)}</span></li>)}</ul>}
          </Panel>
          {insps.length > 0 && (
            <Panel title="Inspections">
              <ul className="space-y-2 text-[13.5px]">{insps.map((i) => <li key={i.id} className="rounded-xl bg-canvas p-3"><b className={i.passed ? 'text-ok' : 'text-bad'}>{i.passed ? 'Passed' : 'Failed'}</b> · {i.checks.filter((c) => c.result === 'pass').length}/{i.checks.length} · battery {i.batteryHealth ?? '—'}% · SSD {i.ssdHealth ?? '—'}%<br /><span className="text-mute">{i.inspectorName}, {formatDate(i.createdAt, true)}</span>{i.checks.filter((c) => c.result === 'fail').map((c) => <span key={c.item} className="block text-bad">✕ {c.item}</span>)}</li>)}</ul>
            </Panel>
          )}
          <Panel title="History">
            <ol className="space-y-2 text-[13px]">{events.map(({ e, by }) => <li key={e.id}><span className="mono text-mute">{formatDate(e.createdAt, true)}</span> · {e.kind}{e.toStatus ? ` → ${UNIT_STATUS_LABEL[e.toStatus as keyof typeof UNIT_STATUS_LABEL] ?? e.toStatus}` : ''}{e.note ? ` · ${e.note}` : ''}{by ? <span className="text-mute"> ({by})</span> : null}</li>)}</ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
