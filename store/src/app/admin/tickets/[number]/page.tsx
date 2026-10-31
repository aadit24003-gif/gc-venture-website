import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { ticketByNumber, TICKET_CATEGORIES, TICKET_STATUS } from '@/lib/tickets';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { formatDate } from '@/lib/format';
import { ActionForm } from '@/components/admin/ActionForm';
import { PageHead, Panel } from '../../ui';
import { staffReply } from '../actions';

export default async function TicketAdmin({ params }: { params: Promise<{ number: string }> }) {
  await requireStaff('tickets.manage');
  const t = await ticketByNumber((await params).number);
  if (!t) notFound();
  const d = await db();
  const [o] = t.ticket.orderId ? await d.select({ number: orders.number }).from(orders).where(eq(orders.id, t.ticket.orderId)).limit(1) : [];
  return (
    <div className="max-w-[900px]">
      <PageHead back={{ href: '/admin/tickets', label: 'Support tickets' }} title={t.ticket.subject}
        intro={<span className="flex flex-wrap items-center gap-2"><span className={`pill pill-${TICKET_STATUS[t.ticket.status]?.tone ?? 'info'}`}>{TICKET_STATUS[t.ticket.status]?.label}</span><span className="mono">{t.ticket.number}</span> · {TICKET_CATEGORIES[t.ticket.category]} · {t.ticket.name}, {t.ticket.contact}{o && <> · order <Link href={`/admin/orders/${o.number}`} className="mono underline">{o.number}</Link></>}{t.ticket.userId && <> · <Link href={`/admin/customers/${t.ticket.userId}`} className="underline">customer</Link></>}</span>} />
      <ol className="space-y-3">
        {t.messages.map((m) => (
          <li key={m.id} className={`rounded-card p-4 ${m.internal ? 'border border-warn/30 bg-warn-soft' : m.fromStaff ? 'ml-10 bg-white border border-line' : 'mr-10 bg-canvas-2'}`}>
            <p className="text-[12.5px] text-mute">{m.fromStaff ? (m.internal ? 'Internal note' : 'Staff reply') : t.ticket.name} · {formatDate(m.createdAt, true)}</p>
            <p className="mt-1 whitespace-pre-line text-[14.5px]">{m.body}</p>
          </li>
        ))}
      </ol>
      <Panel title="Reply" className="mt-6">
        <ActionForm action={staffReply.bind(null, t.ticket.id)} submit="Send" reset>
          <textarea name="body" className="field" aria-label="Reply" />
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[14px]">
            <label className="flex items-center gap-2"><input type="checkbox" name="internal" className="check" /> Internal note</label>
            <label className="flex items-center gap-2">Set status <select name="status" className="field !min-h-9 !w-auto text-[13.5px]" defaultValue=""><option value="">Automatic</option>{Object.entries(TICKET_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select></label>
          </div>
        </ActionForm>
      </Panel>
    </div>
  );
}
