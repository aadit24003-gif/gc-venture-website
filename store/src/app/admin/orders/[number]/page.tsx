import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { Printer } from 'lucide-react';
import { requireStaff } from '@/lib/auth/session';
import { orderByNumber, refundable } from '@/lib/orders';
import { NEXT_STATUS, PAYMENT_STATUS, STATUS } from '@/lib/order-status';
import { KIND_LABEL, SERVICE_STATUS, type ServiceKind } from '@/lib/service';
import { db } from '@/lib/db';
import { auditLogs, inventoryUnits, users } from '@/lib/db/schema';
import { GRADES, type GradeKey } from '@/lib/config';
import { formatDate, formatPhone, gb, rupees } from '@/lib/format';
import { PageHead, Panel } from '../../ui';
import OrderControls from './OrderControls';
import { shiprocketConfigured } from '@/lib/shipping';

export default async function AdminOrder({ params }: { params: Promise<{ number: string }> }) {
  const v = await requireStaff('orders.view');
  const data = await orderByNumber((await params).number);
  if (!data) notFound();
  const { order: o, items, events, payments, refunds, shipments, requests } = data;
  const d = await db();
  const [customer] = o.userId ? await d.select().from(users).where(eq(users.id, o.userId)).limit(1) : [];
  const [audits, units, canRefundAmt] = await Promise.all([
    d.select().from(auditLogs).where(and(eq(auditLogs.entity, 'order'), eq(auditLogs.entityId, o.number))).orderBy(desc(auditLogs.createdAt)).limit(30),
    d.select({ id: inventoryUnits.id, code: inventoryUnits.code, status: inventoryUnits.status, location: inventoryUnits.location }).from(inventoryUnits).where(eq(inventoryUnits.orderId, o.id)),
    refundable(o.id),
  ]);
  const ship = shipments.filter((s) => s.direction === 'forward').at(-1);
  const st = STATUS[o.status] ?? { label: o.status, tone: 'info' as const };
  const pay = PAYMENT_STATUS[o.paymentStatus] ?? { label: o.paymentStatus, tone: 'info' as const };
  return (
    <div>
      <PageHead back={{ href: '/admin/orders', label: 'Orders' }} title={`Order ${o.number}`}
        intro={<span className="flex flex-wrap items-center gap-2"><span className={`pill pill-${st.tone}`}>{st.label}</span><span className={`pill pill-${pay.tone}`}>{pay.label}</span><span>Placed {formatDate(o.createdAt, true)} · {o.paymentMethod === 'cod' ? 'pay on delivery' : o.paymentMethod}</span></span>}
        actions={<><Link href={`/admin/orders/${o.number}/label`} className="btn btn-ghost btn-sm"><Printer size={15} /> Packing slip</Link><Link href={`/orders/${o.number}/invoice`} className="btn btn-ghost btn-sm">Invoice</Link><Link href={`/orders/${o.number}`} className="btn btn-ghost btn-sm">Customer view</Link></>} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel title="Laptops to pick">
            <ul className="divide-y divide-line">
              {items.map((i) => {
                const u = units.find((x) => x.id === i.unitId);
                return (
                  <li key={i.id} className="flex flex-wrap justify-between gap-3 py-3 text-[14px]">
                    <div>
                      <p className="font-semibold">{i.title}</p>
                      <p className="text-mute">{GRADES[i.grade as GradeKey]?.label} · {gb(i.ramGb)} · {gb(i.ssdGb)} SSD · {i.warrantyMonths}-month warranty</p>
                      {i.unitCode && <p className="mono mt-1 text-[12.5px]"><Link href={`/admin/inventory/${i.unitCode}`} className="underline">{i.unitCode}</Link> · serial {i.serialNumber} · battery {i.batteryHealth}%{u?.location ? ` · ${u.location}` : ''}{u ? ` · unit ${u.status}` : ''}</p>}
                    </div>
                    <p className="mono text-right">{rupees(i.unitPrice)}{i.studentDiscount ? <><br /><span className="text-[12px] text-ok">−{rupees(i.studentDiscount)} student</span></> : null}</p>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-2 space-y-1 border-t border-line pt-3 text-[14px]">
              <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="mono">{rupees(o.subtotal)}</dd></div>
              {!!o.studentDiscount && <div className="flex justify-between"><dt className="text-mute">Student discount</dt><dd className="mono">−{rupees(o.studentDiscount)}</dd></div>}
              {!!o.couponDiscount && <div className="flex justify-between"><dt className="text-mute">Coupon {o.couponCode}</dt><dd className="mono">−{rupees(o.couponDiscount)}</dd></div>}
              {!!o.shippingFee && <div className="flex justify-between"><dt className="text-mute">Delivery</dt><dd className="mono">{rupees(o.shippingFee)}</dd></div>}
              {!!o.codFee && <div className="flex justify-between"><dt className="text-mute">COD fee</dt><dd className="mono">{rupees(o.codFee)}</dd></div>}
              <div className="flex justify-between font-semibold"><dt>Total (GST {rupees(o.taxAmount)})</dt><dd className="mono">{rupees(o.total)}</dd></div>
              {o.refundedAmount > 0 && <div className="flex justify-between text-bad"><dt>Refunded</dt><dd className="mono">−{rupees(o.refundedAmount)}</dd></div>}
            </dl>
          </Panel>

          <Panel title="Payments and refunds">
            <ul className="space-y-2 text-[13.5px]">
              {payments.map((p) => <li key={p.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-canvas p-3"><span><b>{p.provider}</b> · {p.status}{p.method ? ` · ${p.method}` : ''}{p.errorReason ? ` · ${p.errorReason}` : ''}<br /><span className="mono text-[12px] text-mute">{p.providerPaymentId ?? p.providerOrderId ?? '—'}</span></span><span className="mono">{rupees(p.amount)} <span className="text-mute">{formatDate(p.createdAt, true)}</span></span></li>)}
              {refunds.map((r) => <li key={r.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-bad-soft p-3"><span><b>Refund</b> · {r.status} · {r.reason}<br /><span className="mono text-[12px] text-mute">{r.providerRefundId ?? 'manual'}</span></span><span className="mono">{rupees(r.amount)} <span className="text-mute">{formatDate(r.createdAt, true)}</span></span></li>)}
            </ul>
          </Panel>

          {ship && (
            <Panel title="Shipment">
              <p className="text-[14px]">{ship.carrier ?? 'Courier'} · <span className="mono">{ship.awb}</span> · {ship.status}{ship.trackingUrl && <> · <a href={ship.trackingUrl} className="underline" target="_blank" rel="noopener">track</a></>}</p>
              <ol className="mt-3 space-y-1.5 border-l border-line pl-4 text-[13.5px]">{[...ship.events].reverse().map((e, i) => <li key={i}><b>{STATUS[e.status]?.label ?? e.status}</b>{e.location ? `, ${e.location}` : ''}{e.note ? ` · ${e.note}` : ''} <span className="text-mute">{formatDate(e.at, true)}</span></li>)}</ol>
            </Panel>
          )}

          {requests.length > 0 && (
            <Panel title="Returns and claims">
              <ul className="space-y-2 text-[14px]">{requests.map((r) => <li key={r.id}><Link href={`/admin/returns/${r.number}`} className="flex justify-between gap-3 rounded-xl border border-line p-3 hover:border-ink"><span><b>{KIND_LABEL[r.kind as ServiceKind]}</b> <span className="mono text-[12px] text-mute">{r.number}</span> · {r.reason}</span><span className={`pill pill-${SERVICE_STATUS[r.status]?.tone ?? 'info'}`}>{SERVICE_STATUS[r.status]?.label ?? r.status}</span></Link></li>)}</ul>
            </Panel>
          )}

          <Panel title="History">
            <ol className="space-y-2.5 text-[13.5px]">
              {[...events].reverse().map((e) => <li key={e.id} className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" aria-hidden="true" /><span><b>{STATUS[e.status]?.label ?? (e.status === 'placed' ? 'Placed' : e.status)}</b>{e.note ? `: ${e.note}` : ''}<br /><span className="text-mute">{formatDate(e.createdAt, true)}</span></span></li>)}
            </ol>
            {audits.length > 0 && (
              <details className="mt-4 text-[13px]">
                <summary className="cursor-pointer text-mute">Audit trail ({audits.length})</summary>
                <ul className="mt-2 space-y-1">{audits.map((a) => <li key={a.id}><span className="mono text-mute">{formatDate(a.createdAt, true)}</span> · {a.actorLabel} · {a.action}{a.data ? <span className="text-mute"> {JSON.stringify(a.data).slice(0, 140)}</span> : null}</li>)}</ul>
              </details>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <OrderControls
            order={{ id: o.id, status: o.status, adminNote: o.adminNote, carrier: o.courier ?? ship?.carrier ?? null, awb: o.trackingNumber ?? ship?.awb ?? null, trackingUrl: o.trackingUrl ?? ship?.trackingUrl ?? null, online: o.paymentMethod === 'razorpay' || o.paymentMethod === 'demo', paid: o.paymentStatus === 'paid' }}
            next={NEXT_STATUS[o.status] ?? []} refundable={canRefundAmt}
            manualRefunds={refunds.filter((r) => r.status === 'manual').map((r) => ({ id: r.id, amount: `${rupees(r.amount)} · ${r.reason}` }))}
            canManage={v.can('orders.manage')} canRefund={v.can('refunds.manage')} shiprocket={shiprocketConfigured()}
          />
          <Panel title="Ship to">
            <p className="text-[14px] leading-relaxed"><b>{o.address.name}</b>, {formatPhone(o.address.phone)}<br />{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}{o.address.landmark ? `, near ${o.address.landmark}` : ''}<br />{o.address.city}, {o.address.state} {o.address.pincode}</p>
            {o.gstin && <p className="mono mt-2 text-[13px]">GSTIN {o.gstin}</p>}
            <p className="mt-3 text-[14px]"><span className="text-mute">Customer:</span> {customer ? <Link href={`/admin/customers/${customer.id}`} className="underline">{customer.name ?? customer.email ?? customer.phone}</Link> : 'Guest'}{o.email ? ` · ${o.email}` : ''}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
