import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { addresses, tickets, users } from '@/lib/db/schema';
import { ordersForViewer } from '@/lib/orders';
import { studentStatus } from '@/lib/students';
import { PAYMENT_STATUS, STATUS } from '@/lib/order-status';
import { ROLE_LABEL } from '@/lib/rbac';
import { TICKET_STATUS } from '@/lib/tickets';
import { formatDate, formatPhone, rupees } from '@/lib/format';
import { RunButton } from '@/components/admin/ActionForm';
import { PageHead, Panel } from '../../ui';
import { setDisabled } from '../../staff/actions';

export default async function Customer({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireStaff('customers.view');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const d = await db();
  const [u] = await d.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) notFound();
  const [os, addrs, ts, student] = await Promise.all([
    ordersForViewer({ user: u }, 100),
    d.select().from(addresses).where(eq(addresses.userId, id)),
    d.select().from(tickets).where(eq(tickets.userId, id)).orderBy(desc(tickets.updatedAt)),
    studentStatus(id),
  ]);
  const spent = os.filter((o) => ['paid', 'partially_refunded'].includes(o.paymentStatus)).reduce((n, o) => n + o.total - o.refundedAmount, 0);
  return (
    <div>
      <PageHead back={{ href: '/admin/customers', label: 'Customers' }} title={u.name ?? 'No name'}
        intro={<>{u.email ?? 'no email'}{u.emailVerifiedAt ? ' (confirmed)' : ''} · {u.phone ? formatPhone(u.phone) : 'no phone'}{u.phoneVerifiedAt ? ' (confirmed)' : ''} · joined {formatDate(u.createdAt)} · {ROLE_LABEL[u.role]}{u.disabledAt ? ' · switched off' : ''}</>}
        actions={v.can('staff.manage') ? <RunButton action={setDisabled.bind(null, u.id, !u.disabledAt)} label={u.disabledAt ? 'Switch account on' : 'Switch account off'} confirmText={u.disabledAt ? undefined : 'Switch this account off and sign it out everywhere?'} /> : undefined} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title={`Orders (${os.length}) · ${rupees(spent)} spent`}>
          {os.length ? (
            <ul className="divide-y divide-line text-[14px]">{os.map((o) => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><Link href={`/admin/orders/${o.number}`} className="mono font-semibold hover:underline">{o.number}</Link><span className="text-mute">{o.items.map((i) => i.title).join(', ')}</span><span className="flex items-center gap-2"><span className={`pill pill-${STATUS[o.status]?.tone}`}>{STATUS[o.status]?.label}</span><span className={`pill pill-${PAYMENT_STATUS[o.paymentStatus]?.tone}`}>{PAYMENT_STATUS[o.paymentStatus]?.label}</span><span className="mono">{rupees(o.total)}</span></span></li>)}</ul>
          ) : <p className="text-mute">No orders.</p>}
        </Panel>
        <div className="space-y-6">
          <Panel title="Student discount"><p className="text-[14px]">{student.state === 'approved' ? `Verified until ${formatDate(student.row?.approvedUntil)}` : student.state === 'pending' ? 'Waiting for a decision' : student.state === 'rejected' ? `Rejected: ${student.row?.rejectReason}` : 'Not verified'}</p></Panel>
          <Panel title="Addresses">{addrs.length ? <ul className="space-y-2 text-[13.5px]">{addrs.map((a) => <li key={a.id}>{a.isDefault && <span className="pill pill-ink mr-1 !h-5">default</span>}{a.name}, {a.line1}, {a.city} {a.pincode}</li>)}</ul> : <p className="text-mute">None saved.</p>}</Panel>
          <Panel title="Support">{ts.length ? <ul className="space-y-2 text-[13.5px]">{ts.map((t) => <li key={t.id}><Link href={`/admin/tickets/${t.number}`} className="underline">{t.subject}</Link> <span className={`pill pill-${TICKET_STATUS[t.status]?.tone} !h-5`}>{TICKET_STATUS[t.status]?.label}</span></li>)}</ul> : <p className="text-mute">No tickets.</p>}</Panel>
          {v.can('staff.manage') && <p className="text-[13px] text-mute">Change this person’s role in <Link href="/admin/staff" className="underline">Staff and roles</Link>.</p>}
        </div>
      </div>
    </div>
  );
}
