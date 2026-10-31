import Link from 'next/link';
import { and, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { STATUS } from '@/lib/orders';
import { formatDate, rupees } from '@/lib/format';
import Pill from '@/components/admin/Pill';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'confirmed', label: 'To pack', statuses: ['confirmed'] },
  { key: 'packed', label: 'To ship', statuses: ['packed'] },
  { key: 'shipped', label: 'Shipped', statuses: ['shipped'] },
  { key: 'delivered', label: 'Delivered', statuses: ['delivered'] },
  { key: 'unpaid', label: 'Unpaid', statuses: ['awaiting_payment', 'payment_failed'] },
  { key: 'closed', label: 'Cancelled or returned', statuses: ['cancelled', 'returned'] },
];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const f = FILTERS.find((x) => x.key === (sp.status ?? '')) ?? FILTERS[0];
  const q = (sp.q ?? '').trim();
  const where: SQL[] = [];
  if (f.statuses) where.push(inArray(orders.status, f.statuses));
  if (q) where.push(or(ilike(orders.number, `%${q}%`), ilike(orders.phone, `%${q.replace(/\D/g, '') || q}%`), ilike(orders.email, `%${q}%`))!);
  const d = await db();
  const rows = await d.select().from(orders).where(where.length ? and(...where) : undefined).orderBy(desc(orders.createdAt)).limit(200);

  return (
    <div>
      <h1 className="text-[38px]">Orders</h1>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((x) => (
          <Link key={x.key} href={`/admin/orders${x.key ? `?status=${x.key}` : ''}`} className="chip !min-h-[36px] !text-[14px]" data-on={x.key === f.key}>{x.label}</Link>
        ))}
        <form className="ml-auto flex gap-2" action="/admin/orders">
          {f.key && <input type="hidden" name="status" value={f.key} />}
          <label htmlFor="oq" className="sr-only">Search orders</label>
          <input id="oq" name="q" defaultValue={q} placeholder="Order number, phone or email" className="field !min-h-[40px] !w-[260px]" />
          <button className="btn btn-ghost btn-sm">Search</button>
        </form>
      </div>
      <div className="sheet mt-5 overflow-x-auto p-2">
        {rows.length === 0 ? <p className="p-6 text-mute">No orders match.</p> : (
          <table className="w-full min-w-[760px] text-[14.5px]">
            <thead><tr className="text-left text-[13px] text-mute"><th className="px-4 py-3 font-medium">Order</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Payment</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Total</th></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t border-line hover:bg-bench/60">
                  <td className="px-4 py-3"><Link href={`/admin/orders/${o.number}`} className="font-semibold text-spruce hover:underline">{o.number}</Link><br /><span className="text-[13px] text-mute">{formatDate(o.createdAt, true)}</span></td>
                  <td className="px-4 py-3">{o.address.name}<br /><span className="text-[13px] text-mute">{o.address.city}, {o.address.pincode}</span></td>
                  <td className="px-4 py-3">{o.paymentMethod === 'cod' ? 'On delivery' : o.paymentMethod === 'demo' ? 'Online (demo)' : 'Online'}<br /><span className="text-[13px] text-mute">{o.paymentStatus === 'cod_due' ? 'Due on delivery' : o.paymentStatus}</span></td>
                  <td className="px-4 py-3"><Pill status={o.status} /></td>
                  <td className="px-4 py-3 text-right font-semibold">{rupees(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="hint mt-3">{rows.length} shown{rows.length === 200 ? ' (latest 200)' : ''}. Statuses: {Object.values(STATUS).map((s) => s.label).join(', ')}.</p>
    </div>
  );
}
