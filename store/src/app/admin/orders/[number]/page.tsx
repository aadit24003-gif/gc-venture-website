import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { orderByNumber, STATUS } from '@/lib/orders';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { GRADES, type GradeKey } from '@/lib/config';
import { formatDate, formatPhone, gb, rupees } from '@/lib/format';
import Pill from '@/components/admin/Pill';
import OrderControls from './OrderControls';

export default async function AdminOrder({ params }: { params: Promise<{ number: string }> }) {
  const data = await orderByNumber((await params).number);
  if (!data) notFound();
  const { order: o, items, events } = data;
  const d = await db();
  const [customer] = await d.select().from(users).where(eq(users.id, o.userId)).limit(1);

  return (
    <div>
      <Link href="/admin/orders" className="link text-[14px]">All orders</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-[34px]">Order {o.number}</h1>
        <Pill status={o.status} />
      </div>
      <p className="mt-1 text-mute">Placed {formatDate(o.createdAt, true)}. Payment: {o.paymentMethod === 'cod' ? 'on delivery' : 'online'}, {o.paymentStatus === 'cod_due' ? 'due on delivery' : o.paymentStatus}{o.razorpayPaymentId ? ` (${o.razorpayPaymentId})` : ''}.</p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className="sheet p-6" aria-labelledby="ai-h">
            <h2 id="ai-h" className="text-[22px]">Items to pick</h2>
            <table className="mt-3 w-full text-[14.5px]">
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-t border-line align-top">
                    <td className="py-3 pr-3 font-semibold">{i.qty} ×</td>
                    <td className="py-3"><span className="font-semibold text-spruce">{i.title}</span><br />
                      <span className="text-mute">{GRADES[i.grade as GradeKey]?.label} grade, {gb(i.ramGb)} RAM, {gb(i.ssdGb)} SSD, {i.warrantyMonths}-month warranty</span></td>
                    <td className="py-3 text-right">{rupees(i.unitPrice * i.qty)}{i.studentDiscount ? <><br /><span className="text-[13px] text-pass">student −{rupees(i.studentDiscount)}</span></> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-[14.5px]">
              <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd>{rupees(o.subtotal)}</dd></div>
              {!!o.studentDiscount && <div className="flex justify-between"><dt className="text-mute">Student discount</dt><dd>−{rupees(o.studentDiscount)}</dd></div>}
              {!!o.couponDiscount && <div className="flex justify-between"><dt className="text-mute">Coupon {o.couponCode}</dt><dd>−{rupees(o.couponDiscount)}</dd></div>}
              {!!o.codFee && <div className="flex justify-between"><dt className="text-mute">COD fee</dt><dd>{rupees(o.codFee)}</dd></div>}
              <div className="flex justify-between text-[16px] font-semibold"><dt>{o.paymentMethod === 'cod' && o.paymentStatus !== 'paid' ? 'Collect on delivery' : 'Total'}</dt><dd>{rupees(o.total)}</dd></div>
            </dl>
          </section>

          <section className="sheet p-6" aria-labelledby="hist-h">
            <h2 id="hist-h" className="text-[22px]">History</h2>
            <ol className="mt-3 space-y-3 text-[14.5px]">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-spruce" />
                  <span><b>{STATUS[e.status]?.label ?? e.status}</b>{e.note ? `: ${e.note}` : ''}<br /><span className="text-mute">{formatDate(e.createdAt, true)}</span></span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <OrderControls order={{ id: o.id, status: o.status, courier: o.courier, trackingNumber: o.trackingNumber, trackingUrl: o.trackingUrl, adminNote: o.adminNote }} />
          <section className="sheet p-6 text-[14.5px]" aria-labelledby="cust-h">
            <h2 id="cust-h" className="text-[22px]">Ship to</h2>
            <p className="mt-3 leading-relaxed"><b>{o.address.name}</b>, {formatPhone(o.address.phone)}<br />{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}{o.address.landmark ? `, near ${o.address.landmark}` : ''}<br />{o.address.city}, {o.address.state} {o.address.pincode}</p>
            {o.gstin && <p className="mt-2">GSTIN <b>{o.gstin}</b></p>}
            <h3 className="mt-5 text-[16px]">Account</h3>
            <p className="mt-1 text-mute">{customer?.name ?? 'No name'}, {customer?.phone ? formatPhone(customer.phone) : customer?.email}{o.email ? `, receipts to ${o.email}` : ''}</p>
            <p className="mt-3 flex gap-4"><Link href={`/orders/${o.number}`} className="link">Customer’s view</Link>{o.paymentStatus === 'paid' && <Link href={`/orders/${o.number}/invoice`} className="link">Invoice</Link>}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
