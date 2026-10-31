import Link from 'next/link';
import { desc, eq, inArray } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { orders, serviceRequests } from '@/lib/db/schema';
import { KIND_LABEL, OPEN_SERVICE, SERVICE_STATUS, type ServiceKind } from '@/lib/service';
import { formatDate } from '@/lib/format';
import { PageHead, Table, td } from '../ui';

export const metadata = { title: 'Returns and warranty' };

export default async function Returns({ searchParams }: { searchParams: Promise<{ show?: string; kind?: string }> }) {
  await requireStaff('service.manage');
  const sp = await searchParams;
  const d = await db();
  const rows = await d.select({ r: serviceRequests, number: orders.number, name: orders.address }).from(serviceRequests).innerJoin(orders, eq(orders.id, serviceRequests.orderId))
    .where(sp.show === 'all' ? undefined : inArray(serviceRequests.status, OPEN_SERVICE)).orderBy(desc(serviceRequests.createdAt)).limit(200);
  const list = rows.filter((x) => !sp.kind || x.r.kind === sp.kind);
  return (
    <div>
      <PageHead title="Returns and warranty" intro="Returns, replacements, warranty claims and complaints. Every status change and public note is emailed to the customer." />
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/admin/returns" className="chip !min-h-8 !text-[13px]" aria-current={sp.show !== 'all' && !sp.kind ? 'page' : undefined}>Open</Link>
        <Link href="/admin/returns?show=all" className="chip !min-h-8 !text-[13px]" aria-current={sp.show === 'all' ? 'page' : undefined}>All</Link>
        {Object.entries(KIND_LABEL).map(([k, l]) => <Link key={k} href={`/admin/returns?kind=${k}${sp.show ? `&show=${sp.show}` : ''}`} className="chip !min-h-8 !text-[13px]" aria-current={sp.kind === k ? 'page' : undefined}>{l}</Link>)}
      </div>
      <Table head={['Request', 'Type', 'Order', 'Customer', 'Reason', 'Status', 'Opened']} empty={list.length ? false : 'Nothing here.'}>
        {list.map(({ r, number, name }) => (
          <tr key={r.id}>
            <td className={td}><Link href={`/admin/returns/${r.number}`} className="mono font-semibold hover:underline">{r.number}</Link></td>
            <td className={td}>{KIND_LABEL[r.kind as ServiceKind]}</td>
            <td className={td}><Link href={`/admin/orders/${number}`} className="mono underline">{number}</Link></td>
            <td className={td}>{name.name}</td>
            <td className={td}>{r.reason}</td>
            <td className={td}><span className={`pill pill-${SERVICE_STATUS[r.status]?.tone ?? 'info'}`}>{SERVICE_STATUS[r.status]?.label ?? r.status}</span></td>
            <td className={`${td} text-mute`}>{formatDate(r.createdAt, true)}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
