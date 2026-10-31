import Link from 'next/link';
import { and, desc, eq, ilike, inArray, or, sql, type SQL, isNull } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { orderItems, orders } from '@/lib/db/schema';
import { PAYMENT_STATUS, STATUS } from '@/lib/order-status';
import { formatDate, formatPhone, rupees } from '@/lib/format';
import { Filters, PageHead, Pager, Table, td } from '../ui';

export const metadata = { title: 'Orders' };
const PER = 30;

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; pay?: string; q?: string; page?: string }> }) {
  await requireStaff('orders.view');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const conds: SQL[] = [];
  if (sp.status === 'to_ship') conds.push(inArray(orders.status, ['confirmed', 'quality_check', 'packed']));
  else if (sp.status === 'video') conds.push(inArray(orders.status, ['confirmed', 'quality_check', 'packed']), isNull(orders.videoCallAt));
  else if (sp.status && STATUS[sp.status]) conds.push(eq(orders.status, sp.status));
  if (sp.pay && PAYMENT_STATUS[sp.pay]) conds.push(eq(orders.paymentStatus, sp.pay));
  const q = (sp.q ?? '').trim();
  if (q) conds.push(or(ilike(orders.number, `%${q}%`), ilike(orders.email, `%${q}%`), ilike(orders.phone, `%${q.replace(/\D/g, '') || q}%`), sql`${orders.address}->>'name' ilike ${`%${q}%`}`)!);
  const where = conds.length ? and(...conds) : undefined;
  const d = await db();
  const [[{ n }], rows] = await Promise.all([
    d.select({ n: sql<number>`count(*)::int` }).from(orders).where(where),
    d.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(PER).offset((page - 1) * PER),
  ]);
  const items = rows.length ? await d.select({ orderId: orderItems.orderId, title: orderItems.title, unitCode: orderItems.unitCode }).from(orderItems).where(inArray(orderItems.orderId, rows.map((r) => r.id))) : [];
  return (
    <div>
      <PageHead title="Orders" intro={`${n} ${n === 1 ? 'order' : 'orders'}${sp.status || sp.pay || q ? ' match these filters' : ''}.`} />
      <Filters action="/admin/orders">
        <label className="text-[12.5px] text-mute">Search<input name="q" defaultValue={q} placeholder="Number, name, email, phone" className="field !min-h-9 w-[260px] text-[13.5px]" /></label>
        <label className="text-[12.5px] text-mute">Status<select name="status" defaultValue={sp.status ?? ''} className="field !min-h-9 text-[13.5px]"><option value="">Any</option><option value="to_ship">To pack and ship</option><option value="video">Video call to make</option>{Object.entries(STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select></label>
        <label className="text-[12.5px] text-mute">Payment<select name="pay" defaultValue={sp.pay ?? ''} className="field !min-h-9 text-[13.5px]"><option value="">Any</option>{Object.entries(PAYMENT_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select></label>
      </Filters>
      <Table head={['Order', 'Customer', 'Laptops', 'Total', 'Payment', 'Status', 'Placed']} empty={rows.length ? false : 'No orders match.'}>
        {rows.map((o) => (
          <tr key={o.id} className="hover:bg-canvas/50">
            <td className={td}><Link href={`/admin/orders/${o.number}`} className="mono font-semibold hover:underline">{o.number}</Link></td>
            <td className={td}>{o.address.name}<br /><span className="text-mute">{o.address.city} · {formatPhone(o.phone ?? o.address.phone)}</span>{!o.userId && <span className="pill pill-done ml-1 !h-5">guest</span>}</td>
            <td className={td}>{items.filter((i) => i.orderId === o.id).map((i, k) => <span key={k} className="block">{i.title} <span className="mono text-[11.5px] text-mute">{i.unitCode}</span></span>)}</td>
            <td className={`${td} mono`}>{rupees(o.total)}</td>
            <td className={td}><span className={`pill pill-${PAYMENT_STATUS[o.paymentStatus]?.tone ?? 'info'}`}>{PAYMENT_STATUS[o.paymentStatus]?.label ?? o.paymentStatus}</span><br /><span className="text-[12px] text-mute">{o.paymentMethod}</span></td>
            <td className={td}><span className={`pill pill-${STATUS[o.status]?.tone ?? 'info'}`}>{STATUS[o.status]?.label ?? o.status}</span></td>
            <td className={`${td} whitespace-nowrap text-mute`}>{formatDate(o.createdAt, true)}</td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil(n / PER)} base="/admin/orders" params={{ status: sp.status, pay: sp.pay, q }} />
    </div>
  );
}
