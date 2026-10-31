import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewer } from '@/lib/auth/session';
import { ordersForViewer } from '@/lib/orders';
import { PAYMENT_STATUS, STATUS } from '@/lib/order-status';
import { formatDate, rupees } from '@/lib/format';
import { StatusPill } from '@/components/ui/bits';

export const metadata: Metadata = { title: 'Your orders', robots: { index: false } };

export default async function Orders() {
  const v = await requireViewer('/account/orders');
  const orders = await ordersForViewer(v, 100);
  return (
    <div>
      <h1 className="text-[32px]">Orders</h1>
      {!v.user.emailVerifiedAt && v.user.email && <p className="mt-2 text-[14px] text-mute">Guest orders placed with {v.user.email} appear here once you confirm that email.</p>}
      {orders.length === 0 ? (
        <div className="mt-6 rounded-[20px] border border-dashed border-line-2 p-10 text-center"><p className="font-semibold">No orders yet</p><Link href="/laptops" className="btn btn-primary mt-4">Shop laptops</Link></div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/orders/${o.number}`} className="mono text-[15px] font-semibold hover:underline">{o.number}</Link>
                  <p className="text-[13.5px] text-mute">Placed {formatDate(o.createdAt)}{o.deliveredAt ? ` · delivered ${formatDate(o.deliveredAt)}` : ''}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2"><StatusPill label={STATUS[o.status]?.label ?? o.status} tone={STATUS[o.status]?.tone ?? 'info'} /><StatusPill label={PAYMENT_STATUS[o.paymentStatus]?.label ?? o.paymentStatus} tone={PAYMENT_STATUS[o.paymentStatus]?.tone ?? 'info'} /></div>
              </div>
              <ul className="mt-3 text-[14.5px]">{o.items.map((i) => <li key={i.id}>{i.title} <span className="mono text-[12px] text-mute">{i.unitCode}</span></li>)}</ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <span className="price text-[18px]">{rupees(o.total)}</span>
                <span className="flex gap-2">
                  {['paid', 'partially_refunded', 'refunded'].includes(o.paymentStatus) && <Link href={`/orders/${o.number}/invoice`} className="btn btn-ghost btn-sm">Invoice</Link>}
                  <Link href={`/orders/${o.number}`} className="btn btn-primary btn-sm">{['awaiting_payment', 'payment_failed'].includes(o.status) ? 'Pay now' : 'Track and manage'}</Link>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
