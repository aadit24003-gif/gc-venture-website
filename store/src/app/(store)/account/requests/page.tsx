import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewer } from '@/lib/auth/session';
import { ordersForViewer } from '@/lib/orders';
import { KIND_LABEL, requestsForUser, SERVICE_STATUS, type ServiceKind } from '@/lib/service';
import { formatDate } from '@/lib/format';
import { StatusPill } from '@/components/ui/bits';

export const metadata: Metadata = { title: 'Returns and repairs', robots: { index: false } };

export default async function Requests() {
  const v = await requireViewer('/account/requests');
  const orders = await ordersForViewer(v, 200);
  const list = await requestsForUser(v.user.id, orders.map((o) => o.id));
  const delivered = orders.filter((o) => o.status === 'delivered');
  return (
    <div>
      <h1 className="text-[32px]">Returns and repairs</h1>
      <p className="mt-2 text-mute">Returns, replacements, warranty claims and complaints, with every update. To start one, open the order it’s about.</p>
      {delivered.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">{delivered.slice(0, 6).map((o) => <Link key={o.id} href={`/orders/${o.number}#help-h`} className="chip">Start one for {o.number}</Link>)}</div>
      )}
      {list.length === 0 ? (
        <p className="mt-8 rounded-card border border-dashed border-line-2 p-8 text-center text-mute">No requests yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {list.map((r) => (
            <li key={r.id}>
              <Link href={`/account/requests/${r.number}`} className="card flex flex-wrap items-center justify-between gap-3 p-5 hover:border-ink">
                <span><b>{KIND_LABEL[r.kind as ServiceKind]}</b> <span className="mono text-[12.5px] text-mute">{r.number}</span><span className="block text-[13.5px] text-mute">{r.reason} · opened {formatDate(r.createdAt)}</span></span>
                <StatusPill label={SERVICE_STATUS[r.status]?.label ?? r.status} tone={SERVICE_STATUS[r.status]?.tone ?? 'info'} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
