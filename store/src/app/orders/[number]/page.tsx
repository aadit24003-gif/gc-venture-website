import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { MessageCircle, Printer, Truck } from 'lucide-react';
import { requireViewer } from '@/lib/auth/session';
import { orderByNumber, STATUS, TIMELINE } from '@/lib/orders';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { GRADES, POLICY, whatsappLink, type GradeKey } from '@/lib/config';
import { formatDate, formatPhone, gb, rupees } from '@/lib/format';
import LaptopArt from '@/components/LaptopArt';
import PayAgain from '@/components/checkout/PayAgain';
import StatusTimeline from '@/components/StatusTimeline';

export const metadata: Metadata = { title: 'Your order', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ placed?: string }> }) {
  const { number } = await params;
  const viewer = await requireViewer(`/orders/${number}`);
  const data = await orderByNumber(number);
  if (!data || (data.order.userId !== viewer.user.id && !viewer.isAdmin)) notFound();
  const { order: o, items, events } = data;
  const placed = (await searchParams).placed === '1';
  const d = await db();
  const arts = await Promise.all(items.map((i) => d.select({ art: products.art, brand: products.brand, slug: products.slug }).from(products).where(eq(products.id, i.productId)).limit(1).then((r) => r[0])));
  const st = STATUS[o.status] ?? { label: o.status, tone: 'wait' };
  const unpaid = ['awaiting_payment', 'payment_failed'].includes(o.status) && o.paymentMethod !== 'cod';

  return (
    <div className="wrap max-w-[1080px] pb-10 pt-8 md:pt-12">
      {placed && o.status !== 'awaiting_payment' && o.status !== 'payment_failed' && (
        <div className="mb-8 overflow-hidden rounded-[28px] bg-spruce p-7 text-white md:p-10">
          <p className="text-[15px] text-tag">Order {o.number}</p>
          <h1 className="mt-2 max-w-[22ch] text-[34px] text-white md:text-[46px]">Thank you. Your laptop is reserved and on our test bench.</h1>
          <p className="mt-3 max-w-[60ch] text-white/80">
            {o.email ? `A confirmation is on its way to ${o.email}. ` : ''}We run the checks once more, pack it, and email you a tracking link when it ships.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {!(placed && o.status !== 'awaiting_payment') && <h1 className="text-[34px] md:text-[44px]">Order {o.number}</h1>}
          <p className="mt-1 text-mute">Placed {formatDate(o.createdAt, true)}</p>
        </div>
        <span className={`rounded-full px-4 py-1.5 text-[14px] font-semibold ${st.tone === 'bad' ? 'bg-alert-soft text-alert' : st.tone === 'wait' ? 'bg-tag-soft text-spruce' : 'bg-pass-soft text-pass'}`}>{st.label}</span>
      </div>

      {unpaid && (
        <div className="mt-6 rounded-[24px] bg-tag-soft p-5 md:flex md:items-center md:justify-between md:gap-6">
          <p className="text-[15.5px]">{o.status === 'payment_failed' ? 'The last payment attempt failed.' : 'This order isn’t paid yet.'} Unpaid orders are released after 30 minutes.</p>
          <div className="mt-3 md:mt-0"><PayAgain number={o.number} amount={o.total} /></div>
        </div>
      )}

      {TIMELINE.includes(o.status as (typeof TIMELINE)[number]) && (
        <section className="sheet mt-6 p-6 md:p-8" aria-label="Progress">
          <StatusTimeline status={o.status} events={events.map((e) => ({ status: e.status, at: e.createdAt.toISOString() }))} />
          {o.status === 'shipped' && (o.courier || o.trackingNumber) && (
            <p className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl bg-bench px-4 py-3 text-[15px]">
              <Truck size={18} className="text-spruce" />
              {o.courier && <span>With <b>{o.courier}</b>.</span>}
              {o.trackingNumber && <span>Tracking number <b className="num">{o.trackingNumber}</b>.</span>}
              {o.trackingUrl && <a href={o.trackingUrl} className="link font-semibold" target="_blank" rel="noopener">Follow the parcel</a>}
            </p>
          )}
        </section>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="sheet p-6 md:p-8" aria-labelledby="items-h">
          <h2 id="items-h" className="text-[22px]">Items</h2>
          <ul className="mt-4 divide-y divide-line">
            {items.map((i, k) => (
              <li key={i.id} className="flex gap-4 py-4">
                <div className="w-[96px] shrink-0 rounded-xl bg-bench p-2">{arts[k] && <LaptopArt art={arts[k].art} brand={arts[k].brand} slug={arts[k].slug} flat />}</div>
                <div className="min-w-0 flex-1">
                  <Link href={`/laptops/${arts[k]?.slug ?? ''}`} className="font-semibold text-spruce hover:underline">{i.qty > 1 ? `${i.qty} × ` : ''}{i.title}</Link>
                  <p className="text-[14px] text-mute">{GRADES[i.grade as GradeKey]?.label ?? i.grade} grade, {gb(i.ramGb)} memory, {gb(i.ssdGb)} SSD</p>
                  <p className="text-[14px] text-mute">{i.warrantyMonths / 12 === 1 ? '1-year' : `${i.warrantyMonths / 12}-year`} warranty</p>
                </div>
                <p className="price text-[18px]">{rupees(i.unitPrice * i.qty)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-1.5 border-t border-line pt-4 text-[15px]">
            <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd>{rupees(o.subtotal)}</dd></div>
            {!!o.studentDiscount && <div className="flex justify-between"><dt className="text-mute">Student discount</dt><dd className="text-pass">−{rupees(o.studentDiscount)}</dd></div>}
            {!!o.couponDiscount && <div className="flex justify-between"><dt className="text-mute">Coupon {o.couponCode}</dt><dd className="text-pass">−{rupees(o.couponDiscount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-mute">Delivery</dt><dd>{o.shippingFee ? rupees(o.shippingFee) : 'Free'}</dd></div>
            {!!o.codFee && <div className="flex justify-between"><dt className="text-mute">Pay on delivery fee</dt><dd>{rupees(o.codFee)}</dd></div>}
            <div className="flex items-baseline justify-between pt-2"><dt className="font-semibold text-spruce">Total</dt><dd className="price text-[26px]">{rupees(o.total)}</dd></div>
          </dl>
        </section>

        <div className="space-y-6">
          <section className="sheet p-6" aria-labelledby="ship-h">
            <h2 id="ship-h" className="text-[20px]">Delivery to</h2>
            <p className="mt-3 text-[15px] leading-relaxed">
              <span className="font-semibold">{o.address.name}</span>, {formatPhone(o.address.phone)}<br />
              {o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}<br />
              {o.address.landmark ? <>Near {o.address.landmark}<br /></> : null}
              {o.address.city}, {o.address.state} {o.address.pincode}
            </p>
            {o.gstin && <p className="mt-2 text-[14px] text-mute">GSTIN {o.gstin}</p>}
          </section>
          <section className="sheet p-6" aria-labelledby="pay-h">
            <h2 id="pay-h" className="text-[20px]">Payment</h2>
            <p className="mt-3 text-[15px]">
              {o.paymentMethod === 'cod' ? (o.paymentStatus === 'paid' ? 'Paid on delivery' : 'Pay on delivery') : o.paymentStatus === 'paid' ? `Paid online${o.paidAt ? `, ${formatDate(o.paidAt)}` : ''}` : o.paymentStatus === 'refunded' ? 'Refunded' : 'Not paid'}
            </p>
            {o.paymentStatus === 'paid' && (
              <Link href={`/orders/${o.number}/invoice`} className="btn btn-ghost btn-sm mt-4"><Printer size={16} /> Invoice</Link>
            )}
          </section>
          <section className="rounded-[28px] bg-spruce p-6 text-white/85">
            <h2 className="text-[20px] text-white">Need help with this order?</h2>
            <p className="mt-2 text-[14.5px]">Returns within {POLICY.returnDays} days of delivery; warranty for {POLICY.warrantyMonths} months.</p>
            <a href={whatsappLink(`Hi, I need help with order ${o.number}.`)} target="_blank" rel="noopener" className="btn btn-tag btn-sm mt-4"><MessageCircle size={16} /> WhatsApp us</a>
          </section>
        </div>
      </div>
      <p className="mt-8"><Link href="/account" className="link">All your orders</Link></p>
    </div>
  );
}
