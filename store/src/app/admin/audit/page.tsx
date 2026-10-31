import { and, desc, eq, ilike, type SQL } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { formatDate } from '@/lib/format';
import { Filters, PageHead, Pager, Table, td } from '../ui';

export const metadata = { title: 'Audit log' };
const PER = 100;

export default async function Audit({ searchParams }: { searchParams: Promise<{ entity?: string; q?: string; page?: string }> }) {
  await requireStaff('audit.view');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const conds: SQL[] = [];
  if (sp.entity) conds.push(eq(auditLogs.entity, sp.entity));
  if (sp.q) conds.push(ilike(auditLogs.entityId, `%${sp.q}%`));
  const d = await db();
  const rows = await d.select().from(auditLogs).where(conds.length ? and(...conds) : undefined).orderBy(desc(auditLogs.createdAt)).limit(PER + 1).offset((page - 1) * PER);
  return (
    <div>
      <PageHead title="Audit log" intro="Every staff action and every money movement: who, what, when." />
      <Filters action="/admin/audit">
        <label className="text-[12.5px] text-mute">Area<select name="entity" defaultValue={sp.entity ?? ''} className="field !min-h-9 text-[13.5px]"><option value="">All</option>{['order', 'unit', 'product', 'coupon', 'refund', 'service_request', 'ticket', 'review', 'user', 'settings', 'page', 'post', 'template', 'student_verification', 'brand', 'category'].map((e) => <option key={e}>{e}</option>)}</select></label>
        <label className="text-[12.5px] text-mute">Record<input name="q" defaultValue={sp.q ?? ''} placeholder="Order number, unit code…" className="field !min-h-9 text-[13.5px]" /></label>
      </Filters>
      <Table head={['When', 'Who', 'Action', 'Record', 'Details']} empty={rows.length ? false : 'Nothing logged yet.'}>
        {rows.slice(0, PER).map((a) => (
          <tr key={a.id}>
            <td className={`${td} mono whitespace-nowrap text-[12.5px] text-mute`}>{formatDate(a.createdAt, true)}</td>
            <td className={td}>{a.actorLabel}</td>
            <td className={`${td} mono text-[12.5px]`}>{a.action}</td>
            <td className={`${td} mono text-[12.5px]`}>{a.entity}:{a.entityId}</td>
            <td className={`${td} max-w-[420px] truncate text-[12px] text-mute`} title={a.data ? JSON.stringify(a.data) : ''}>{a.data ? JSON.stringify(a.data) : ''}</td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={rows.length > PER ? page + 1 : page} base="/admin/audit" params={{ entity: sp.entity, q: sp.q }} />
    </div>
  );
}
