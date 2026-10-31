import type { Metadata } from 'next';
import Link from 'next/link';
import { inArray } from 'drizzle-orm';
import { requireViewer } from '@/lib/auth/session';
import { ordersForViewer } from '@/lib/orders';
import { db } from '@/lib/db';
import { warranties } from '@/lib/db/schema';
import { POLICY } from '@/lib/config';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Warranty', robots: { index: false } };

export default async function Warranty() {
  const v = await requireViewer('/account/warranty');
  const orders = await ordersForViewer(v, 200);
  const d = await db();
  const ws = orders.length ? await d.select().from(warranties).where(inArray(warranties.orderId, orders.map((o) => o.id))) : [];
  const now = Date.now();
  return (
    <div>
      <h1 className="text-[32px]">Warranty</h1>
      <p className="mt-2 max-w-[60ch] text-mute">Every laptop has a {POLICY.warrantyMonths}-month warranty from delivery, tied to its serial number. To claim, open the laptop below and describe the fault; we arrange a free pickup. <Link href="/warranty" className="underline">What’s covered</Link></p>
      {ws.length === 0 ? (
        <p className="mt-8 rounded-[20px] border border-dashed border-line-2 p-8 text-center text-mute">Warranties start when a laptop is delivered. None yet.</p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {ws.map((w) => {
            const o = orders.find((x) => x.id === w.orderId)!;
            const left = Math.ceil((w.endsAt.getTime() - now) / 86_400_000);
            const total = Math.ceil((w.endsAt.getTime() - w.startsAt.getTime()) / 86_400_000);
            const active = w.status === 'active' && left > 0;
            return (
              <li key={w.id} className="cert p-6" style={{ ['--cert-bg' as string]: '#fff' }}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold">{w.title}</p><p className="mono text-[12px] text-mute">Serial {w.serialNumber ?? '—'}</p></div>
                  <span className={`pill ${active ? 'pill-ok' : 'pill-done'}`}>{active ? 'Active' : w.status === 'void' ? 'Void' : 'Ended'}</span>
                </div>
                <div className="meter mt-5"><span style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }} /></div>
                <p className="mt-2 text-[13.5px] text-mute">{active ? `${left} days left · ends ${formatDate(w.endsAt)}` : `Ended ${formatDate(w.endsAt)}`} · {w.months} months from {formatDate(w.startsAt)}</p>
                {active && <Link href={`/orders/${o.number}#help-h`} className="btn btn-primary btn-sm mt-4">Make a claim</Link>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
