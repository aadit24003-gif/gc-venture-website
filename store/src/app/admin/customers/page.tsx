import Link from 'next/link';
import { desc, eq, ilike, or, sql } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { orders, users } from '@/lib/db/schema';
import { formatDate, formatPhone, rupees } from '@/lib/format';
import { Filters, PageHead, Pager, Table, td } from '../ui';

export const metadata = { title: 'Customers' };
const PER = 40;

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff('customers.view');
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const where = q ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`), ilike(users.phone, `%${q.replace(/\D/g, '') || q}%`)) : undefined;
  const d = await db();
  const stats = d.select({ userId: orders.userId, n: sql<number>`count(*)::int`.as('n'), spent: sql<number>`coalesce(sum(case when ${orders.paymentStatus} in ('paid','partially_refunded') then ${orders.total} - ${orders.refundedAmount} else 0 end),0)::bigint`.as('spent'), last: sql<Date>`max(${orders.createdAt})`.as('last') }).from(orders).groupBy(orders.userId).as('s');
  const [[{ n }], rows] = await Promise.all([
    d.select({ n: sql<number>`count(*)::int` }).from(users).where(where),
    d.select({ u: users, orders: stats.n, spent: stats.spent, last: stats.last }).from(users).leftJoin(stats, eq(stats.userId, users.id)).where(where).orderBy(desc(users.createdAt)).limit(PER).offset((page - 1) * PER),
  ]);
  return (
    <div>
      <PageHead title="Customers" intro={`${n} ${n === 1 ? 'account' : 'accounts'}. Guest orders are matched to an account once the customer confirms the same email or phone.`} />
      <Filters action="/admin/customers"><label className="text-[12.5px] text-mute">Search<input name="q" defaultValue={q} placeholder="Name, email or phone" className="field !min-h-9 w-[280px] text-[13.5px]" /></label></Filters>
      <Table head={['Customer', 'Contact', 'Orders', 'Spent', 'Last order', 'Joined']} empty={rows.length ? false : 'No customers match.'}>
        {rows.map(({ u, orders: o, spent, last }) => (
          <tr key={u.id}>
            <td className={td}><Link href={`/admin/customers/${u.id}`} className="font-semibold hover:underline">{u.name ?? 'No name'}</Link>{u.role !== 'customer' && <span className="pill pill-ink ml-2 !h-5">staff</span>}{u.disabledAt && <span className="pill pill-bad ml-2 !h-5">off</span>}</td>
            <td className={td}>{u.email ?? '—'}{u.emailVerifiedAt ? ' ✓' : ''}<br /><span className="text-mute">{u.phone ? formatPhone(u.phone) : '—'}{u.phoneVerifiedAt ? ' ✓' : ''}</span></td>
            <td className={`${td} mono`}>{o ?? 0}</td>
            <td className={`${td} mono`}>{spent ? rupees(Number(spent)) : '—'}</td>
            <td className={`${td} text-mute`}>{last ? formatDate(last) : '—'}</td>
            <td className={`${td} text-mute`}>{formatDate(u.createdAt)}</td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil(n / PER)} base="/admin/customers" params={{ q }} />
    </div>
  );
}
