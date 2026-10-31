import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewer } from '@/lib/auth/session';
import { ticketsForUser, TICKET_CATEGORIES, TICKET_STATUS } from '@/lib/tickets';
import { ordersForViewer } from '@/lib/orders';
import { formatDate } from '@/lib/format';
import { whatsappLink } from '@/lib/config';
import { StatusPill } from '@/components/ui/bits';
import NewTicket from './NewTicket';

export const metadata: Metadata = { title: 'Support', robots: { index: false } };

export default async function Support() {
  const v = await requireViewer('/account/support');
  const [list, orders] = await Promise.all([ticketsForUser(v.user.id), ordersForViewer(v, 20)]);
  return (
    <div>
      <h1 className="text-[32px]">Support</h1>
      <p className="mt-2 text-mute">Write to us here and the whole conversation stays in one place. For a quick question, <a href={whatsappLink()} className="underline" target="_blank" rel="noopener">WhatsApp</a> is fastest.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="card p-6" aria-labelledby="nt-h"><h2 id="nt-h" className="text-[19px]">New message</h2><div className="mt-4"><NewTicket categories={TICKET_CATEGORIES} orders={orders.map((o) => o.number)} /></div></section>
        <section aria-labelledby="ct-h">
          <h2 id="ct-h" className="text-[19px]">Your conversations</h2>
          {list.length === 0 ? <p className="mt-4 text-mute">None yet.</p> : (
            <ul className="mt-4 space-y-2">
              {list.map((t) => (
                <li key={t.id}><Link href={`/account/support/${t.number}`} className="card flex items-center justify-between gap-3 p-4 hover:border-ink">
                  <span className="min-w-0"><b className="block truncate">{t.subject}</b><span className="text-[13px] text-mute"><span className="mono">{t.number}</span> · {TICKET_CATEGORIES[t.category] ?? t.category} · {formatDate(t.updatedAt)}</span></span>
                  <StatusPill label={TICKET_STATUS[t.status]?.label ?? t.status} tone={TICKET_STATUS[t.status]?.tone ?? 'info'} />
                </Link></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
