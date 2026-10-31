import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth/session';
import { orderByNumber } from '@/lib/orders';
import { getSettings } from '@/lib/settings';
import { BRAND, GRADES, type GradeKey } from '@/lib/config';
import { formatDate, formatPhone, gb, rupees } from '@/lib/format';
import PrintButton from '@/app/(store)/orders/[number]/invoice/PrintButton';

export const metadata = { title: 'Packing slip' };

/** Printable packing slip and address label for manual shipping. */
export default async function Label({ params }: { params: Promise<{ number: string }> }) {
  await requireStaff('orders.view');
  const data = await orderByNumber((await params).number);
  if (!data) notFound();
  const s = await getSettings();
  const { order: o, items } = data;
  const cod = (o.paymentMethod === 'cod' && o.paymentStatus !== 'paid') || o.paymentStatus === 'part_paid';
  return (
    <div className="mx-auto max-w-[800px] bg-white p-6 print:p-0">
      <div className="mb-4 flex justify-end print:hidden"><PrintButton /></div>
      <section className="rounded-xl border-2 border-ink p-6">
        <div className="flex justify-between gap-6">
          <div><p className="text-[12px] text-mute">SHIP TO</p><p className="mt-1 text-[22px] font-bold leading-tight">{o.address.name}</p><p className="text-[17px] leading-snug">{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}{o.address.landmark ? `, near ${o.address.landmark}` : ''}<br />{o.address.city}, {o.address.state}<br /><b className="text-[26px] tracking-wider">{o.address.pincode}</b><br />{formatPhone(o.address.phone)}</p></div>
          <div className="text-right"><p className="mono text-[20px] font-bold">{o.number}</p><p className="text-[13px]">{formatDate(o.createdAt)}</p>{cod ? <p className="mt-3 rounded-lg bg-ink px-3 py-2 text-[18px] font-bold text-white">COLLECT {rupees(o.total - o.bookingAmount)}</p> : <p className="mt-3 rounded-lg border-2 border-ink px-3 py-2 text-[16px] font-bold">PREPAID</p>}</div>
        </div>
        <p className="mt-5 border-t border-line pt-3 text-[12.5px]">FROM: {BRAND.name} · {s.business.legalName} · {s.business.returnAddress} · {formatPhone(s.business.phone)}</p>
      </section>
      <section className="mt-8">
        <h1 className="text-[20px]">Packing slip · {o.number}</h1>
        <table className="mt-3 w-full text-[14px]">
          <thead><tr className="border-b border-line text-left"><th className="py-2">Laptop</th><th className="py-2">Unit</th><th className="py-2">Serial</th><th className="py-2">Check</th></tr></thead>
          <tbody>{items.map((i) => <tr key={i.id} className="border-b border-line align-top"><td className="py-2">{i.title}<br /><span className="text-mute">{GRADES[i.grade as GradeKey]?.label} · {gb(i.ramGb)} · {gb(i.ssdGb)} · {i.warrantyMonths} mo warranty</span></td><td className="mono py-2">{i.unitCode}</td><td className="mono py-2">{i.serialNumber}</td><td className="py-2">☐ tested ☐ charger ☐ sealed</td></tr>)}</tbody>
        </table>
        <p className="mt-4 text-[13px]">Packed by: ____________ · Date: ____________</p>
      </section>
    </div>
  );
}
