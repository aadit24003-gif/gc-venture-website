import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireViewer } from '@/lib/auth/session';
import { orderByNumber } from '@/lib/orders';
import { BRAND, GRADES, LEGAL, type GradeKey } from '@/lib/config';
import { formatDate, formatPhone, gb, rupees } from '@/lib/format';
import PrintButton from './PrintButton';

export const metadata: Metadata = { title: 'Invoice', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * Printable invoice. [CONFIRM] GST treatment of refurbished goods (regular 18% or the
 * margin scheme) with your accountant; prices are shown inclusive of GST without a split.
 */
export default async function InvoicePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const viewer = await requireViewer(`/orders/${number}/invoice`);
  const data = await orderByNumber(number);
  if (!data || (data.order.userId !== viewer.user.id && !viewer.isAdmin) || data.order.paymentStatus !== 'paid') notFound();
  const { order: o, items } = data;
  return (
    <div className="wrap max-w-[860px] py-10 print:py-0">
      <div className="mb-6 flex justify-end print:hidden"><PrintButton /></div>
      <article className="sheet p-8 md:p-12 print:rounded-none print:p-0">
        <header className="flex flex-wrap justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="display text-[28px] font-bold text-spruce">{BRAND.name}</p>
            <p className="mt-1 text-[14px] text-mute">{LEGAL.entity}<br />{LEGAL.addresses[0].lines.join(', ')}{LEGAL.gstin ? <><br />GSTIN {LEGAL.gstin}</> : null}</p>
          </div>
          <div className="text-right text-[14.5px]">
            <h1 className="text-[26px]">Invoice</h1>
            <p className="mt-1">No. {o.number}</p>
            <p className="text-mute">Date {formatDate(o.paidAt ?? o.createdAt)}</p>
          </div>
        </header>
        <section className="grid gap-6 border-b border-line py-6 text-[14.5px] sm:grid-cols-2">
          <div>
            <h2 className="text-[15px]">Billed and shipped to</h2>
            <p className="mt-2 leading-relaxed">{o.address.name}<br />{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}<br />{o.address.city}, {o.address.state} {o.address.pincode}<br />{formatPhone(o.address.phone)}{o.email ? <><br />{o.email}</> : null}</p>
            {o.gstin && <p className="mt-2">GSTIN {o.gstin}</p>}
          </div>
          <div className="sm:text-right">
            <h2 className="text-[15px]">Payment</h2>
            <p className="mt-2">{o.paymentMethod === 'cod' ? 'Paid on delivery' : 'Paid online'}{o.razorpayPaymentId ? <><br /><span className="text-mute">Ref. {o.razorpayPaymentId}</span></> : null}</p>
          </div>
        </section>
        <table className="w-full text-[14.5px]">
          <thead><tr className="border-b border-line text-left text-mute"><th className="py-3 font-medium">Item</th><th className="py-3 font-medium">HSN</th><th className="py-3 text-right font-medium">Qty</th><th className="py-3 text-right font-medium">Amount</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-line align-top">
                <td className="py-3">{i.title}, refurbished<br /><span className="text-mute">{GRADES[i.grade as GradeKey]?.label} grade, {gb(i.ramGb)} memory, {gb(i.ssdGb)} SSD, {i.warrantyMonths}-month warranty</span></td>
                <td className="py-3">8471</td>
                <td className="py-3 text-right">{i.qty}</td>
                <td className="py-3 text-right">{rupees(i.unitPrice * i.qty, { decimals: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto mt-4 max-w-[320px] space-y-1.5 text-[14.5px]">
          <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd>{rupees(o.subtotal, { decimals: true })}</dd></div>
          {!!o.studentDiscount && <div className="flex justify-between"><dt className="text-mute">Student discount</dt><dd>−{rupees(o.studentDiscount, { decimals: true })}</dd></div>}
          {!!o.couponDiscount && <div className="flex justify-between"><dt className="text-mute">Coupon</dt><dd>−{rupees(o.couponDiscount, { decimals: true })}</dd></div>}
          {!!o.codFee && <div className="flex justify-between"><dt className="text-mute">Pay on delivery fee</dt><dd>{rupees(o.codFee, { decimals: true })}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2 text-[16px] font-semibold"><dt>Total, inclusive of GST</dt><dd>{rupees(o.total, { decimals: true })}</dd></div>
        </dl>
        <p className="mt-10 text-[13px] text-mute">Refurbished goods. Warranty from the date of delivery. Questions: {LEGAL.grievanceOfficer.email}.</p>
      </article>
    </div>
  );
}
