import { desc, eq, sql } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import { formatDate } from '@/lib/format';
import { PageHead, Table, td } from '../ui';

export const metadata = { title: 'Newsletter' };

export default async function Newsletter() {
  await requireStaff('newsletter.view');
  const d = await db();
  const [rows, [{ n }]] = await Promise.all([
    d.select().from(subscribers).orderBy(desc(subscribers.createdAt)).limit(300),
    d.select({ n: sql<number>`count(*)::int` }).from(subscribers).where(eq(subscribers.status, 'subscribed')),
  ]);
  return (
    <div>
      <PageHead title="Newsletter" intro={`${n} subscribed. Sign-ups come from the footer, the home page and “notify me” on sold-out models (source restock:<model>). Send campaigns with your email tool; export the list below.`} actions={<a href="/api/admin/newsletter" className="btn btn-primary btn-sm">Download CSV</a>} />
      <Table head={['Email', 'Status', 'Source', 'Joined']} empty={rows.length ? false : 'No subscribers yet.'}>
        {rows.map((r) => <tr key={r.id}><td className={td}>{r.email}</td><td className={td}><span className={`pill ${r.status === 'subscribed' ? 'pill-ok' : 'pill-done'}`}>{r.status}</span></td><td className={`${td} mono text-[12px]`}>{r.source}</td><td className={`${td} text-mute`}>{formatDate(r.createdAt)}</td></tr>)}
      </Table>
    </div>
  );
}
