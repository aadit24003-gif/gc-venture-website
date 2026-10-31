import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { TICKET_CATEGORIES, TICKET_STATUS } from '@/lib/tickets';
import { formatDate } from '@/lib/format';
import { PageHead, Table, td } from '../ui';

export const metadata = { title: 'Support tickets' };

export default async function Tickets({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff('tickets.manage');
  const status = (await searchParams).status ?? 'open';
  const d = await db();
  const list = await d.select().from(tickets).where(status === 'all' ? undefined : eq(tickets.status, status)).orderBy(desc(tickets.updatedAt)).limit(200);
  return (
    <div>
      <PageHead title="Support tickets" intro="From the contact form and from customers’ accounts. Replies are emailed when the customer gave an email." />
      <div className="mb-4 flex flex-wrap gap-1.5">{[['open', 'Open'], ['waiting_customer', 'Waiting for customer'], ['resolved', 'Resolved'], ['closed', 'Closed'], ['all', 'All']].map(([k, l]) => <Link key={k} href={`/admin/tickets?status=${k}`} className="chip !min-h-8 !text-[13px]" aria-current={status === k ? 'page' : undefined}>{l}</Link>)}</div>
      <Table head={['Ticket', 'Subject', 'From', 'Topic', 'Status', 'Updated']} empty={list.length ? false : 'Nothing here.'}>
        {list.map((t) => (
          <tr key={t.id}>
            <td className={td}><Link href={`/admin/tickets/${t.number}`} className="mono font-semibold hover:underline">{t.number}</Link></td>
            <td className={td}>{t.subject}</td>
            <td className={td}>{t.name}<br /><span className="text-mute">{t.contact}</span></td>
            <td className={td}>{TICKET_CATEGORIES[t.category] ?? t.category}</td>
            <td className={td}><span className={`pill pill-${TICKET_STATUS[t.status]?.tone ?? 'info'}`}>{TICKET_STATUS[t.status]?.label ?? t.status}</span></td>
            <td className={`${td} text-mute`}>{formatDate(t.updatedAt, true)}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
