import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireViewer } from '@/lib/auth/session';
import { canViewOrder } from '@/lib/orders';
import { KIND_LABEL, requestByNumber, SERVICE_STATUS, type ServiceKind } from '@/lib/service';
import { db } from '@/lib/db';
import { refunds } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { formatDate, rupees } from '@/lib/format';
import { StatusPill } from '@/components/ui/bits';

export const metadata: Metadata = { title: 'Request', robots: { index: false } };

export default async function RequestDetail({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const v = await requireViewer(`/account/requests/${number}`);
  const r = await requestByNumber(number);
  if (!r || !r.order || !canViewOrder({ user: v.user }, r.order)) notFound();
  const d = await db();
  const refs = await d.select().from(refunds).where(eq(refunds.serviceRequestId, r.request.id));
  const st = SERVICE_STATUS[r.request.status] ?? { label: r.request.status, tone: 'info' as const, customer: '' };
  return (
    <div>
      <Link href="/account/requests" className="text-[14px] underline">All requests</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-[30px]">{KIND_LABEL[r.request.kind as ServiceKind]}</h1><StatusPill label={st.label} tone={st.tone} /></div>
      <p className="mono mt-1 text-[13.5px] text-mute">{r.request.number} · order <Link href={`/orders/${r.order.number}`} className="underline">{r.order.number}</Link></p>
      <p className="mt-4 text-[15.5px]">{st.customer}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-6" aria-labelledby="h-h">
          <h2 id="h-h" className="text-[19px]">History</h2>
          <ol className="mt-4 space-y-4 border-l border-line pl-5">
            {r.events.filter((e) => !e.internal).map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-ink" aria-hidden="true" />
                <b>{SERVICE_STATUS[e.status]?.label ?? e.status}</b> <span className="text-[13px] text-mute">{formatDate(e.createdAt, true)}</span>
                {e.note && <p className="mt-0.5 text-[14.5px] text-ink-2">{e.note}</p>}
              </li>
            ))}
          </ol>
        </section>
        <section className="card p-6 text-[14.5px]" aria-labelledby="d-h">
          <h2 id="d-h" className="text-[19px]">Details</h2>
          {r.item && <p className="mt-3"><b>{r.item.title}</b><br /><span className="mono text-[12.5px] text-mute">Unit {r.item.unitCode}</span></p>}
          <p className="mt-3"><span className="text-mute">Reason:</span> {r.request.reason}</p>
          <p className="mt-2 whitespace-pre-line text-ink-2">{r.request.details}</p>
          {r.request.photos.length > 0 && <p className="mt-2 text-mute">{r.request.photos.length} photo{r.request.photos.length > 1 ? 's' : ''} attached</p>}
          {r.request.resolution && <p className="mt-3 rounded-xl bg-canvas p-3"><b>Resolution:</b> {r.request.resolution}</p>}
          {refs.map((x) => <p key={x.id} className="mt-3 rounded-xl bg-canvas p-3"><b>Refund {rupees(x.amount)}</b>: {x.status === 'processed' ? `sent ${formatDate(x.processedAt)}` : x.status === 'manual' ? 'being paid by bank transfer' : 'in progress'}</p>)}
          <Link href="/account/support" className="btn btn-ghost btn-sm mt-5">Message support</Link>
        </section>
      </div>
    </div>
  );
}
