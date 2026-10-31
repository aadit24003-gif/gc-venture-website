'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { refundOrder, saveAdminNote, updateOrderStatus } from '../../actions';
import { toast } from '@/components/Toaster';
import { STATUS } from '@/lib/order-status';

type O = { id: string; status: string; courier: string | null; trackingNumber: string | null; trackingUrl: string | null; adminNote: string | null; refundable: boolean; total: string };

const NEXT: Record<string, { status: 'packed' | 'shipped' | 'delivered'; label: string }> = {
  confirmed: { status: 'packed', label: 'Mark packed' },
  packed: { status: 'shipped', label: 'Mark shipped' },
  shipped: { status: 'delivered', label: 'Mark delivered' },
};

export default function OrderControls({ order }: { order: O }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [courier, setCourier] = useState(order.courier ?? '');
  const [tracking, setTracking] = useState(order.trackingNumber ?? '');
  const [url, setUrl] = useState(order.trackingUrl ?? '');
  const [note, setNote] = useState('');
  const [adminNote, setAdminNote] = useState(order.adminNote ?? '');
  const next = NEXT[order.status];
  const cancellable = ['awaiting_payment', 'payment_failed', 'confirmed', 'packed'].includes(order.status);

  const go = (status: 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned') => start(async () => {
    if (status === 'shipped' && !tracking.trim()) { toast('Add the tracking number first', 'error'); return; }
    if ((status === 'cancelled' || status === 'returned') && !confirm(status === 'cancelled' ? 'Cancel this order and put the stock back?' : 'Mark this order as returned?')) return;
    const r = await updateOrderStatus({ orderId: order.id, status, courier, trackingNumber: tracking, trackingUrl: url, note });
    if (!r.ok) { toast(r.error, 'error'); return; }
    toast(`Marked ${STATUS[status]?.label.toLowerCase() ?? status}`);
    setNote('');
    router.refresh();
  });

  return (
    <section className="sheet p-6" aria-labelledby="ctl-h">
      <h2 id="ctl-h" className="text-[22px]">Next step</h2>
      {next ? (
        <>
          {next.status === 'shipped' && (
            <div className="mt-4 grid gap-3">
              <div><label htmlFor="c" className="label">Courier</label><input id="c" className="field" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. Delhivery, Blue Dart" /></div>
              <div><label htmlFor="t" className="label">Tracking number</label><input id="t" className="field" value={tracking} onChange={(e) => setTracking(e.target.value)} /></div>
              <div><label htmlFor="u" className="label">Tracking link (optional)</label><input id="u" className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></div>
            </div>
          )}
          <div className="mt-3"><label htmlFor="n" className="label">Note for the history (optional)</label><input id="n" className="field" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <button type="button" className="btn btn-primary mt-4 w-full" disabled={pending} onClick={() => go(next.status)}>{pending ? 'Saving…' : next.label}</button>
          {next.status === 'shipped' && <p className="hint">The customer gets an email with the tracking details.</p>}
        </>
      ) : (
        <p className="mt-3 text-mute">{order.status === 'awaiting_payment' || order.status === 'payment_failed' ? 'Waiting for the customer to pay. Unpaid orders are released after 30 minutes.' : 'Nothing more to do.'}</p>
      )}
      {order.refundable && (
        <div className="mt-5 rounded-2xl bg-alert-soft p-4">
          <p className="text-[14.5px] text-alert">This order was paid online and is {order.status}. Refund the customer’s {order.total}.</p>
          <button type="button" className="btn btn-sm mt-3 bg-alert text-white" disabled={pending}
            onClick={() => start(async () => { const r = await refundOrder(order.id); if (!r.ok) { toast(r.error, 'error'); return; } toast('Refund started'); router.refresh(); })}>
            Refund {order.total}
          </button>
        </div>
      )}
      {(cancellable || order.status === 'delivered') && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          {cancellable && <button type="button" className="btn btn-ghost btn-sm !text-alert" disabled={pending} onClick={() => go('cancelled')}>Cancel order</button>}
          {order.status === 'delivered' && <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => go('returned')}>Mark returned</button>}
        </div>
      )}
      <div className="mt-5 border-t border-line pt-4">
        <label htmlFor="an" className="label">Private note</label>
        <textarea id="an" className="field" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Only staff see this" />
        <button type="button" className="btn btn-ghost btn-sm mt-2" disabled={pending} onClick={() => start(async () => { await saveAdminNote(order.id, adminNote); toast('Note saved'); })}>Save note</button>
      </div>
    </section>
  );
}
