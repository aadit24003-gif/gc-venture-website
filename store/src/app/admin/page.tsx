import Link from 'next/link';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, products, studentVerifications, variants } from '@/lib/db/schema';
import { releaseStaleOrders } from '@/lib/orders';
import Pill from '@/components/admin/Pill';
import { formatDate, rupees } from '@/lib/format';
import { GRADES, type GradeKey } from '@/lib/config';

export default async function AdminHome() {
  await releaseStaleOrders();
  const d = await db();
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00+05:30');
  const [[rev], [todayCount], [toShip], [pendingStudents], low, recent] = await Promise.all([
    d.select({ total: sql<number>`coalesce(sum(${orders.total}),0)::bigint`, n: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.paymentStatus, 'paid'), gte(orders.paidAt, since30))),
    d.select({ n: sql<number>`count(*)::int` }).from(orders).where(gte(orders.createdAt, today)),
    d.select({ n: sql<number>`count(*)::int` }).from(orders).where(inArray(orders.status, ['confirmed', 'packed'])),
    d.select({ n: sql<number>`count(*)::int` }).from(studentVerifications).where(eq(studentVerifications.status, 'pending')),
    d.select({ title: products.title, slug: products.slug, grade: variants.grade, stock: variants.stock }).from(variants).innerJoin(products, eq(products.id, variants.productId)).where(and(lte(variants.stock, 1), eq(variants.active, true), eq(products.active, true))).orderBy(variants.stock).limit(8),
    d.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
  ]);

  const stats = [
    { label: 'Paid sales, last 30 days', value: rupees(Number(rev.total)), note: `${rev.n} orders` },
    { label: 'Orders today', value: String(todayCount.n), note: 'Since midnight' },
    { label: 'To pack or ship', value: String(toShip.n), note: 'Confirmed or packed', href: '/admin/orders?status=confirmed' },
    { label: 'Student IDs to check', value: String(pendingStudents.n), note: 'Waiting for you', href: '/admin/students' },
  ];

  return (
    <div>
      <h1 className="text-[38px]">Overview</h1>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const body = (
            <>
              <p className="text-[14px] text-mute">{s.label}</p>
              <p className="price mt-1 text-[34px]">{s.value}</p>
              <p className="text-[13px] text-mute">{s.note}</p>
            </>
          );
          return <li key={s.label} className="rounded-[22px] bg-white p-5">{s.href ? <Link href={s.href} className="block">{body}</Link> : body}</li>;
        })}
      </ul>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="sheet p-6" aria-labelledby="recent-h">
          <div className="flex items-center justify-between"><h2 id="recent-h" className="text-[22px]">Latest orders</h2><Link href="/admin/orders" className="link text-[14px]">All orders</Link></div>
          {recent.length === 0 ? <p className="mt-4 text-mute">No orders yet.</p> : (
            <table className="mt-3 w-full text-[14.5px]">
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-t border-line">
                    <td className="py-3"><Link href={`/admin/orders/${o.number}`} className="font-semibold text-spruce hover:underline">{o.number}</Link><br /><span className="text-[13px] text-mute">{formatDate(o.createdAt, true)}</span></td>
                    <td className="py-3">{o.address.name}<br /><span className="text-[13px] text-mute">{o.address.city}</span></td>
                    <td className="py-3"><Pill status={o.status} /></td>
                    <td className="py-3 text-right font-semibold">{rupees(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="sheet p-6" aria-labelledby="low-h">
          <div className="flex items-center justify-between"><h2 id="low-h" className="text-[22px]">Running low</h2><Link href="/admin/products" className="link text-[14px]">Prices and stock</Link></div>
          {low.length === 0 ? <p className="mt-4 text-mute">Every grade has at least 2 in stock.</p> : (
            <ul className="mt-3 divide-y divide-line text-[14.5px]">
              {low.map((l) => (
                <li key={`${l.slug}-${l.grade}`} className="flex justify-between py-2.5">
                  <span>{l.title}, <span className="text-mute">{GRADES[l.grade as GradeKey]?.label}</span></span>
                  <span className={l.stock === 0 ? 'font-semibold text-alert' : 'font-semibold text-ink'}>{l.stock === 0 ? 'Sold out' : `${l.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
