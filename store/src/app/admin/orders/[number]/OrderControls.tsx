'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { confirmManualRefund, issueRefund, reconcilePayment, saveAdminNote, shipWithShiprocket, updateOrderStatus } from '../actions';
import { toast } from '@/components/Toaster';
import { STATUS } from '@/lib/order-status';

type Props = {
  order: { id: string; status: string; adminNote: string | null; carrier: string | null; awb: string | null; trackingUrl: string | null; online: boolean; paid: boolean };
  next: string[]; refundable: number; manualRefunds: { id: string; amount: string }[]; canManage: boolean; canRefund: boolean; shiprocket?: boolean;
};

export default function OrderControls({ order, next, refundable, manualRefunds, canManage, canRefund, shiprocket }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState(next.find((s) => s !== 'cancelled') ?? next[0] ?? '');
  const [carrier, setCarrier] = useState(order.carrier ?? '');
  const [awb, setAwb] = useState(order.awb ?? '');
  const [url, setUrl] = useState(order.trackingUrl ?? '');
  const [loc, setLoc] = useState('');
  const [note, setNote] = useState('');
  const [adminNote, setAdminNote] = useState(order.adminNote ?? '');
  const [amount, setAmount] = useState(String(Math.round(refundable / 100)));
  const [reason, setReason] = useState('');
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, ok?: string) => start(async () => {
    const r = await fn();
    if (!r.ok) toast(r.error ?? 'Failed', 'error');
    else { toast(r.message ?? ok ?? 'Saved'); router.refresh(); }
  });

  return (
    <div className="space-y-5">
      {canManage && next.length > 0 && (
        <section className="rounded-[18px] border border-line bg-white p-5">
          <h2 className="text-[17px]">Move the order on</h2>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Next status">
            {next.map((s) => <button key={s} type="button" className="chip !min-h-8 !text-[13px]" aria-pressed={status === s} onClick={() => setStatus(s)}>{STATUS[s]?.label ?? s}</button>)}
          </div>
          {status === 'shipped' && (
            <div className="mt-4 grid gap-3">
              <div><label htmlFor="oc-c" className="label">Courier</label><input id="oc-c" className="field" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Delhivery, Blue Dart, DTDC…" /></div>
              <div><label htmlFor="oc-a" className="label">AWB / tracking number</label><input id="oc-a" className="field mono" value={awb} onChange={(e) => setAwb(e.target.value)} /></div>
              <div><label htmlFor="oc-u" className="label">Tracking link (optional)</label><input id="oc-u" className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></div>
            </div>
          )}
          {['in_transit', 'out_for_delivery', 'delivery_failed'].includes(status) && <div className="mt-4"><label htmlFor="oc-l" className="label">Location (optional)</label><input id="oc-l" className="field" value={loc} onChange={(e) => setLoc(e.target.value)} /></div>}
          <div className="mt-3"><label htmlFor="oc-n" className="label">{status === 'cancelled' ? 'Reason (the customer sees it)' : 'Note for the history (optional)'}</label><input id="oc-n" className="field" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <button type="button" className={`btn mt-4 w-full ${status === 'cancelled' ? 'btn-danger' : 'btn-primary'}`} disabled={pending || !status}
            onClick={() => { if (status === 'cancelled' && !confirm(`Cancel this order, put its units back on sale${order.paid && order.online ? ' and refund the customer in full' : ''}?`)) return; run(() => updateOrderStatus({ orderId: order.id, status: status as never, carrier, awb, trackingUrl: url, note, location: loc }), `Marked ${STATUS[status]?.label.toLowerCase()}`); }}>
            {pending ? 'Saving…' : `Mark ${STATUS[status]?.label.toLowerCase() ?? status}`}
          </button>
          {status === 'shipped' && shiprocket && <button type="button" className="btn btn-ghost btn-sm mt-2 w-full" disabled={pending} onClick={() => run(() => shipWithShiprocket(order.id))}>Book with Shiprocket instead (AWB and label)</button>}
          {status === 'shipped' && <p className="hint">The customer gets the tracking details by email{' '}and SMS/WhatsApp if set up.</p>}
          {status === 'delivered' && <p className="hint">Starts each laptop’s warranty and, for pay on delivery, records the payment as collected.</p>}
        </section>
      )}

      {canRefund && refundable > 0 && (
        <section className="rounded-[18px] border border-line bg-white p-5">
          <h2 className="text-[17px]">Refund</h2>
          <p className="mt-1 text-[13px] text-mute">Up to ₹{Math.round(refundable / 100).toLocaleString('en-IN')} can be refunded. {order.online ? 'Online payments go back through Razorpay.' : 'Pay-on-delivery refunds are recorded here and paid by bank transfer or UPI.'}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]">
            <div><label htmlFor="rf-a" className="label">Amount ₹</label><input id="rf-a" className="field mono" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} /></div>
            <div><label htmlFor="rf-r" className="label">Reason</label><input id="rf-r" className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Returned within 10 days" /></div>
          </div>
          <button type="button" className="btn btn-danger btn-sm mt-3" disabled={pending} onClick={() => { if (confirm(`Refund ₹${amount}?`)) run(() => issueRefund(order.id, Number(amount), reason)); }}>Refund ₹{amount || 0}</button>
        </section>
      )}
      {canRefund && manualRefunds.length > 0 && (
        <section className="rounded-[18px] border border-line bg-warn-soft p-5">
          <h2 className="text-[17px]">Manual refunds to pay</h2>
          <ul className="mt-2 space-y-2">{manualRefunds.map((m) => <li key={m.id} className="flex items-center justify-between gap-3 text-[14px]"><span>{m.amount}</span><button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => confirmManualRefund(m.id))}>Mark as sent</button></li>)}</ul>
        </section>
      )}
      {canManage && order.online && !order.paid && (
        <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => reconcilePayment(order.id))}>Check payment with Razorpay</button>
      )}
      <section className="rounded-[18px] border border-line bg-white p-5">
        <label htmlFor="an" className="text-[17px] font-semibold">Private note</label>
        <textarea id="an" className="field mt-2" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Only staff see this" />
        <button type="button" className="btn btn-ghost btn-sm mt-2" disabled={pending} onClick={() => run(() => saveAdminNote(order.id, adminNote))}>Save note</button>
      </section>
    </div>
  );
}
