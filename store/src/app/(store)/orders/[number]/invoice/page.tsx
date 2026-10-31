import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getViewer } from '@/lib/auth/session';
import { canViewOrder, orderByNumber } from '@/lib/orders';
import { BRAND, GRADES, type GradeKey } from '@/lib/config';
import { getSettings } from '@/lib/settings';
import { gstFromInclusive } from '@/lib/tax';
import { formatDate, formatPhone, gb, rupees } from '@/lib/format';
import PrintButton from './PrintButton';

export const metadata: Metadata = { title: 'Invoice', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * Printable tax invoice. Prices include GST; the split is shown per settings (regular 18% by default).
 * [CONFIRM] GST treatment of refurbished goods (regular or margin scheme) with your accountant.
 */
export default async function InvoicePage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ key?: string }> }) {
  const [{ number }, { key }, viewer, s] = await Promise.all([params, searchParams, getViewer(), getSettings()]);
  const data = await orderByNumber(number);
  if (!data) notFound();
  const { order: o, items } = data;
  if (!canViewOrder(viewer ? { user: viewer.user } : null, o, key) && !viewer?.can('orders.view')) notFound();
  if (['pending', 'failed', 'cod_due', 'part_paid'].includes(o.paymentStatus)) notFound();
  const tax = gstFromInclusive(o.total, s.tax, o.address.state);
  const lineTax = (amount: number) => gstFromInclusive(amount, s.tax, o.address.state);
  return (
    <div className="wrap max-w-[900px] py-10 print:py-0">
      <div className="mb-6 flex justify-end print:hidden"><PrintButton /></div>
      <article className="sheet p-8 md:p-12 print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="display text-[28px] font-bold">{BRAND.name}<span className="text-accent">.</span></p>
            <p className="mt-1 text-[13.5px] text-mute">{s.business.legalName}<br />{s.business.registeredAddress}{s.business.gstin ? <><br />GSTIN {s.business.gstin}</> : null}{s.business.cin ? <><br />CIN {s.business.cin}</> : null}</p>
          </div>
          <div className="text-right text-[14px]">
            <h1 className="text-[24px]">Tax invoice</h1>
            <p className="mono mt-1">No. {o.number}</p>
            <p className="text-mute">Date {formatDate(o.paidAt ?? o.createdAt)}</p>
            <p className="text-mute">Place of supply: {o.address.state}</p>
          </div>
        </header>
        <section className="grid gap-6 border-b border-line py-6 text-[14px] sm:grid-cols-2">
          <div>
            <h2 className="text-[14px]">Billed and shipped to</h2>
            <p className="mt-2 leading-relaxed">{o.address.name}<br />{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}<br />{o.address.city}, {o.address.state} {o.address.pincode}<br />{formatPhone(o.address.phone)}{o.email ? <><br />{o.email}</> : null}</p>
            {o.gstin && <p className="mono mt-2">GSTIN {o.gstin}</p>}
          </div>
          <div className="sm:text-right">
            <h2 className="text-[14px]">Payment</h2>
            <p className="mt-2">{o.paymentMethod === 'cod' ? 'Paid on delivery' : 'Paid online'}{o.razorpayPaymentId ? <><br /><span className="mono text-mute">Ref. {o.razorpayPaymentId}</span></> : null}</p>
          </div>
        </section>
        <table className="w-full text-[13.5px]">
          <thead><tr className="border-b border-line text-left text-mute"><th className="py-3 font-medium">Item</th><th className="py-3 font-medium">HSN</th><th className="py-3 text-right font-medium">Taxable value</th><th className="py-3 text-right font-medium">Amount</th></tr></thead>
          <tbody>
            {items.map((i) => {
              const amt = i.unitPrice * i.qty - i.studentDiscount;
              const t = lineTax(amt);
              return (
                <tr key={i.id} className="border-b border-line align-top">
                  <td className="py-3 pr-3">{i.title}, refurbished<br /><span className="text-mute">{GRADES[i.grade as GradeKey]?.label} grade, {gb(i.ramGb)} memory, {gb(i.ssdGb)} SSD, {i.warrantyMonths}-month warranty</span>{i.serialNumber && <><br /><span className="mono text-mute">Serial {i.serialNumber} · unit {i.unitCode}</span></>}</td>
                  <td className="mono py-3">{s.tax.hsn}</td>
                  <td className="py-3 text-right">{tax.scheme === 'regular' ? rupees(t.taxable, { decimals: true }) : '—'}</td>
                  <td className="py-3 text-right">{rupees(amt, { decimals: true })}{i.studentDiscount ? <><br /><span className="text-[12px] text-mute">after student discount {rupees(i.studentDiscount, { decimals: true })}</span></> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <dl className="ml-auto mt-4 max-w-[360px] space-y-1.5 text-[14px]">
          <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd>{rupees(o.subtotal, { decimals: true })}</dd></div>
          {!!o.studentDiscount && <div className="flex justify-between"><dt className="text-mute">Student discount</dt><dd>−{rupees(o.studentDiscount, { decimals: true })}</dd></div>}
          {!!o.couponDiscount && <div className="flex justify-between"><dt className="text-mute">Coupon {o.couponCode}</dt><dd>−{rupees(o.couponDiscount, { decimals: true })}</dd></div>}
          {!!o.shippingFee && <div className="flex justify-between"><dt className="text-mute">Delivery</dt><dd>{rupees(o.shippingFee, { decimals: true })}</dd></div>}
          {!!o.codFee && <div className="flex justify-between"><dt className="text-mute">Pay on delivery fee</dt><dd>{rupees(o.codFee, { decimals: true })}</dd></div>}
          {tax.scheme === 'regular' && tax.tax > 0 && (
            <>
              <div className="flex justify-between border-t border-line pt-2"><dt className="text-mute">Taxable value</dt><dd>{rupees(tax.taxable, { decimals: true })}</dd></div>
              {tax.interState
                ? <div className="flex justify-between"><dt className="text-mute">IGST {tax.rate}%</dt><dd>{rupees(tax.igst, { decimals: true })}</dd></div>
                : <><div className="flex justify-between"><dt className="text-mute">CGST {tax.rate / 2}%</dt><dd>{rupees(tax.cgst, { decimals: true })}</dd></div><div className="flex justify-between"><dt className="text-mute">SGST {tax.rate / 2}%</dt><dd>{rupees(tax.sgst, { decimals: true })}</dd></div></>}
            </>
          )}
          <div className="flex justify-between border-t border-line pt-2 text-[16px] font-semibold"><dt>Total{tax.scheme === 'margin' ? ', inclusive of GST' : ''}</dt><dd>{rupees(o.total, { decimals: true })}</dd></div>
          {o.refundedAmount > 0 && <div className="flex justify-between text-mute"><dt>Refunded</dt><dd>−{rupees(o.refundedAmount, { decimals: true })}</dd></div>}
        </dl>
        {tax.scheme === 'margin' && <p className="mt-4 text-[12.5px] text-mute">Second-hand goods: GST paid under the margin scheme; input tax credit is not available on this invoice.</p>}
        <p className="mt-10 text-[12.5px] text-mute">Refurbished goods. Warranty runs from the date of delivery and is tied to the serial number above. Questions: {s.business.email}. Grievance officer: {s.business.grievanceName ? `${s.business.grievanceName}, ` : ''}{s.business.grievanceEmail}.</p>
        {!s.business.gstin && <p className="mt-2 text-[12px] text-warn print:hidden">[CONFIRM] Add your GSTIN in Admin → Settings before issuing tax invoices.</p>}
      </article>
    </div>
  );
}
