import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireViewer } from '@/lib/auth/session';
import { ticketByNumber, TICKET_CATEGORIES, TICKET_STATUS } from '@/lib/tickets';
import { BRAND } from '@/lib/config';
import { formatDate } from '@/lib/format';
import { StatusPill } from '@/components/ui/bits';
import { Reply } from '../NewTicket';

export const metadata: Metadata = { title: 'Conversation', robots: { index: false } };

export default async function Thread({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const v = await requireViewer(`/account/support/${number}`);
  const t = await ticketByNumber(number);
  if (!t || t.ticket.userId !== v.user.id) notFound();
  const st = TICKET_STATUS[t.ticket.status] ?? { label: t.ticket.status, tone: 'info' as const };
  return (
    <div className="max-w-[760px]">
      <Link href="/account/support" className="text-[14px] underline">All conversations</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-[28px]">{t.ticket.subject}</h1><StatusPill label={st.label} tone={st.tone} /></div>
      <p className="mono mt-1 text-[13px] text-mute">{t.ticket.number} · {TICKET_CATEGORIES[t.ticket.category] ?? t.ticket.category}</p>
      <ol className="mt-6 space-y-3">
        {t.messages.filter((m) => !m.internal).map((m) => (
          <li key={m.id} className={`rounded-[18px] p-4 ${m.fromStaff ? 'mr-8 bg-canvas' : 'ml-8 border border-line bg-white'}`}>
            <p className="text-[12.5px] text-mute">{m.fromStaff ? `${BRAND.name} support` : 'You'} · {formatDate(m.createdAt, true)}</p>
            <p className="mt-1 whitespace-pre-line text-[15px]">{m.body}</p>
          </li>
        ))}
      </ol>
      {t.ticket.status !== 'closed' && <Reply number={t.ticket.number} />}
    </div>
  );
}
