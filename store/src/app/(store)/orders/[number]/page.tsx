import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, inArray } from 'drizzle-orm';
import { CheckCircle2, FileText, Package, Truck } from 'lucide-react';
import { getViewer } from '@/lib/auth/session';
import { canViewOrder, orderByNumber } from '@/lib/orders';
import { CANCELLABLE_BY_CUSTOMER, PAYMENT_STATUS, STATUS } from '@/lib/order-status';
import { eligibility, KIND_LABEL, SERVICE_STATUS, type ServiceKind } from '@/lib/service';
import { db } from '@/lib/db';
import { reviews, warranties } from '@/lib/db/schema';
import { GRADES, type GradeKey } from '@/lib/config';
import { formatDate, formatPhone, gb, rupees } from '@/lib/format';
import StatusTimeline from '@/components/StatusTimeline';
import PayAgain from '@/components/checkout/PayAgain';
import { StatusPill } from '@/components/ui/bits';
import { CancelOrder, ReviewForm, ServiceRequestForm } from './OrderActions';

export const metadata: Metadata = { title: 'Your order', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ key?: string; placed?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ number }, sp, viewer] = await Promise.all([params, searchParams, getViewer()]);
  const data = await orderByNumber(number);
  if (!data) notFound();
  const { order: o, items, events, payments, refunds, shipments, requests } = data;
  const key = sp.key ?? null;
  if (!canViewOrder(viewer ? { user: viewer.user } : null, o, key) && !viewer?.can('orders.view')) notFound();

  const d = await db();
  const ws = await d.select().from(warranties).where(eq(warranties.orderId, o.id));
  const myReviews = viewer && items.length ? await d.select({ productId: reviews.productId }).from(reviews).where(and(eq(reviews.userId, viewer.user.id), inArray(reviews.productId, items.map((i) => i.productId)))) : [];
  const reviewed = new Set(myReviews.map((r) => r.productId));
  const el = eligibility(o, ws[0] ?? null);
  const unpaid = ['awaiting_payment', 'payment_failed'].includes(o.status);
  const ship = shipments.filter((s) => s.direction === 'forward').at(-1);
  const st = STATUS[o.status] ?? { label: o.status, tone: 'info' as const, customer: '' };
  const pay = PAYMENT_STATUS[o.paymentStatus] ?? { label: o.paymentStatus, tone: 'info' as const };
  const canReview = viewer && o.userId === viewer.user.id && o.status === 'delivered';
  const toReview = items.filter((i) => !reviewed.has(i.productId)).map((i) => ({ id: i.productId, title: i.title }));

  return (
    <div className="wrap max-w-[1100px] pb-16 pt-8 md:pt-12">
      {sp.placed && (
        <div className="mb-8 flex gap-4 rounded-card border border-line bg-canvas p-6">
          <CheckCircle2 size={28} className="shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[20px] font-semibold">{unpaid ? 'Order saved. Complete the payment to confirm it.' : 'Thank you. Your order is confirmed.'}</p>
            <p className="mt-1 text-mute">{o.email ? `We’ve emailed the details to ${o.email}. ` : ''}{!o.userId ? 'Bookmark this page to follow your order, or create an account with the same email to see it there.' : 'You can follow it here or in your account.'}</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Order</p>
          <h1 className="mono mt-1 text-[30px] font-semibold tracking-[-0.02em] md:text-[38px]">{o.number}</h1>
          <p className="mt-1 text-mute">Placed {formatDate(o.createdAt, true)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><StatusPill label={st.label} tone={st.tone} /><StatusPill label={pay.label} tone={pay.tone} /></div>
      </div>

      <section className="card mt-8 p-6" aria-labelledby="track-h">
        <h2 id="track-h" className="sr-only">Progress</h2>
        <p className="mb-6 text-[15px]">{st.customer}</p>
        {o.status === 'cancelled' ? (
          <p className="rounded-xl bg-canvas p-4 text-[14.5px]">Cancelled {formatDate(o.cancelledAt, true)}{o.cancelReason ? `: ${o.cancelReason}` : ''}.</p>
        ) : (
          <StatusTimeline status={o.status} placedAt={o.createdAt.toISOString()} events={events.map((e) => ({ status: e.status, at: e.createdAt.toISOString() }))} />
        )}
        {unpaid && <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5"><PayAgain number={o.number} amount={o.total} guestKey={key} /><span className="text-[13.5px] text-mute">Unpaid orders are cancelled 30 minutes after they’re placed.</span></div>}
        {ship?.awb && (
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-line pt-5 text-[14.5px]">
            <Truck size={20} aria-hidden="true" />
            <span>{ship.carrier ?? 'Courier'} · AWB <span className="mono">{ship.awb}</span></span>
            {ship.trackingUrl && <a href={ship.trackingUrl} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">Track with courier</a>}
          </div>
        )}
        {ship && ship.events.length > 0 && (
          <details className="mt-4 text-[14px]">
            <summary className="cursor-pointer font-semibold">Shipment updates</summary>
            <ol className="mt-3 space-y-2 border-l border-line pl-4">
              {[...ship.events].reverse().map((e, i) => <li key={i}><b>{STATUS[e.status]?.label ?? e.status}</b>{e.location ? `, ${e.location}` : ''}{e.note ? ` · ${e.note}` : ''} <span className="text-mute">({formatDate(e.at, true)})</span></li>)}
            </ol>
          </details>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6" aria-labelledby="items-h">
          <h2 id="items-h" className="text-[20px]">Laptops</h2>
          <ul className="mt-4 divide-y divide-line">
            {items.map((i) => {
              const w = ws.find((x) => x.orderItemId === i.id);
              return (
                <li key={i.id} className="py-4">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-semibold">{i.title}</p>
                      <p className="text-[13.5px] text-mute">{GRADES[i.grade as GradeKey]?.label} grade · {gb(i.ramGb)} · {gb(i.ssdGb)} SSD · {i.warrantyMonths}-month warranty</p>
                      {i.unitCode && <p className="mono mt-0.5 text-[12px] text-mute">Unit {i.unitCode}{i.batteryHealth ? ` · battery ${i.batteryHealth}%` : ''} · <Link href={`/units/${i.unitCode}`} className="underline">inspection report</Link></p>}
                      {w && <p className="mt-1 text-[13px]"><span className="pill pill-ok">Warranty {w.status === 'active' ? `until ${formatDate(w.endsAt)}` : w.status}</span></p>}
                    </div>
                    <p className="price whitespace-nowrap text-[16px]">{rupees(i.unitPrice)}{i.studentDiscount ? <span className="block text-right text-[12px] font-medium text-ok">−{rupees(i.studentDiscount)} student</span> : null}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <dl className="mt-2 space-y-1.5 border-t border-line pt-4 text-[14.5px]">
            <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="num">{rupees(o.subtotal)}</dd></div>
            {o.studentDiscount > 0 && <div className="flex justify-between"><dt className="text-mute">Student discount</dt><dd className="num">−{rupees(o.studentDiscount)}</dd></div>}
            {o.couponDiscount > 0 && <div className="flex justify-between"><dt className="text-mute">Coupon {o.couponCode}</dt><dd className="num">−{rupees(o.couponDiscount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-mute">Delivery</dt><dd className="num">{o.shippingFee ? rupees(o.shippingFee) : 'Free'}</dd></div>
            {o.codFee > 0 && <div className="flex justify-between"><dt className="text-mute">Pay-on-delivery fee</dt><dd className="num">{rupees(o.codFee)}</dd></div>}
            <div className="flex items-baseline justify-between pt-1"><dt className="font-semibold">Total</dt><dd className="price text-[22px]">{rupees(o.total)}</dd></div>
            {o.taxAmount > 0 && <p className="text-right text-[12px] text-mute">Includes GST of {rupees(o.taxAmount)}</p>}
          </dl>
        </section>

        <div className="space-y-6">
          <section className="card p-6 text-[14.5px]" aria-labelledby="ship-h">
            <h2 id="ship-h" className="text-[20px]">Delivery</h2>
            <p className="mt-3 leading-relaxed"><b>{o.address.name}</b>, {formatPhone(o.address.phone)}<br />{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}{o.address.landmark ? `, near ${o.address.landmark}` : ''}<br />{o.address.city}, {o.address.state} {o.address.pincode}</p>
            {o.gstin && <p className="mt-2">GSTIN <span className="mono">{o.gstin}</span></p>}
          </section>
          <section className="card p-6 text-[14.5px]" aria-labelledby="pay-h">
            <h2 id="pay-h" className="text-[20px]">Payment</h2>
            <p className="mt-3">{o.paymentMethod === 'cod' ? 'Pay on delivery' : o.paymentMethod === 'demo' ? 'Online (demo)' : 'Online through Razorpay'} · <StatusPill label={pay.label} tone={pay.tone} /></p>
            {payments.filter((p) => p.method).map((p) => <p key={p.id} className="mt-1 text-mute">Paid by {p.method?.toUpperCase()}</p>)}
            {refunds.length > 0 && (
              <ul className="mt-3 space-y-2">
                {refunds.map((r) => <li key={r.id} className="rounded-xl bg-canvas p-3"><b>Refund {rupees(r.amount)}</b> · {r.status === 'processed' ? `sent ${formatDate(r.processedAt)}` : r.status === 'manual' ? 'being paid by bank transfer' : r.status === 'failed' ? 'failed, we’ll retry' : 'in progress'}<br /><span className="text-[13px] text-mute">{r.reason}</span></li>)}
              </ul>
            )}
            {o.paymentStatus !== 'pending' && o.paymentStatus !== 'failed' && o.paymentStatus !== 'cod_due' && (
              <Link href={`/orders/${o.number}/invoice${key ? `?key=${key}` : ''}`} className="btn btn-ghost btn-sm mt-4"><FileText size={15} /> Invoice</Link>
            )}
          </section>
          {CANCELLABLE_BY_CUSTOMER.includes(o.status) && (
            <section className="card p-6" aria-label="Cancel">
              <p className="mb-3 text-[14px] text-mute">Changed your mind? You can cancel until we start packing.</p>
              <CancelOrder number={o.number} guestKey={key} paid={o.paymentStatus === 'paid'} />
            </section>
          )}
        </div>
      </div>

      {(o.status === 'delivered' || requests.length > 0 || el.complaint) && !unpaid && o.status !== 'cancelled' && (
        <section className="card mt-6 p-6" aria-labelledby="help-h">
          <h2 id="help-h" className="text-[20px]">Need help with this order?</h2>
          {o.status === 'delivered' && el.daysLeftToReturn != null && <p className="mt-1 text-[14px] text-mute">{el.daysLeftToReturn > 0 ? `${el.daysLeftToReturn} ${el.daysLeftToReturn === 1 ? 'day' : 'days'} left to return or replace.` : 'The return window has closed; warranty claims are still open.'}</p>}
          {requests.length > 0 && (
            <ul className="mt-4 space-y-2">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4 text-[14.5px]">
                  <span><b>{KIND_LABEL[r.kind as ServiceKind]}</b> <span className="mono text-[12.5px] text-mute">{r.number}</span><br /><span className="text-mute">{r.reason} · {formatDate(r.createdAt)}</span></span>
                  <span className="flex items-center gap-3"><StatusPill label={SERVICE_STATUS[r.status]?.label ?? r.status} tone={SERVICE_STATUS[r.status]?.tone ?? 'info'} />{viewer && <Link href={`/account/requests/${r.number}`} className="link text-[14px]">Details</Link>}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5"><ServiceRequestForm number={o.number} guestKey={key} items={items.map((i) => ({ id: i.id, title: i.title, unitCode: i.unitCode }))} allowed={el} /></div>
        </section>
      )}

      {canReview && toReview.length > 0 && (
        <section id="review" className="card mt-6 scroll-mt-32 p-6" aria-labelledby="rev-h">
          <h2 id="rev-h" className="text-[20px]">Review your laptop</h2>
          <p className="mt-1 text-[14px] text-mute">Your review helps other buyers. We publish it after a quick check.</p>
          <div className="mt-5"><ReviewForm number={o.number} products={toReview} /></div>
        </section>
      )}

      {!viewer && !o.userId && (
        <p className="mt-8 flex items-center gap-2 text-[14px] text-mute"><Package size={16} aria-hidden="true" /> Want all your orders in one place? <Link href={`/register?email=${encodeURIComponent(o.email ?? '')}`} className="link">Create an account</Link> with {o.email ?? 'your email'}.</p>
      )}
    </div>
  );
}
