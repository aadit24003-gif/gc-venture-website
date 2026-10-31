'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Star } from 'lucide-react';
import { cancelMyOrder, requestService, submitReview } from './actions';
import { toast } from '@/components/Toaster';

export function CancelOrder({ number, guestKey, paid }: { number: string; guestKey?: string | null; paid: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!open) return <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>Cancel order</button>;
  return (
    <div className="rounded-xl border border-line p-4">
      <label htmlFor="cr" className="label">Why are you cancelling? (optional)</label>
      <input id="cr" className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
      <p className="hint">{paid ? 'You’ll be refunded in full to your original payment method.' : 'Nothing has been charged.'}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => start(async () => { const r = await cancelMyOrder(number, reason, guestKey); if (!r.ok) toast(r.error, 'error'); else { toast('Order cancelled'); router.refresh(); } })}>{pending ? 'Cancelling…' : 'Confirm cancellation'}</button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(false)}>Keep my order</button>
      </div>
    </div>
  );
}

const REASONS: Record<string, string[]> = {
  return: ['Changed my mind', 'Not as described', 'Ordered by mistake', 'Found a better price', 'Other'],
  replacement: ['Arrived faulty', 'Damaged in transit', 'Not as described', 'Missing charger or part', 'Other'],
  warranty: ['Won’t power on', 'Battery or charging', 'Screen', 'Keyboard or touchpad', 'Ports or Wi-Fi', 'Other hardware fault'],
  complaint: ['Delivery', 'Packaging', 'Communication', 'Billing', 'Other'],
};

export function ServiceRequestForm({ number, guestKey, items, allowed }: { number: string; guestKey?: string | null; items: { id: number; title: string; unitCode: string | null }[]; allowed: { return: boolean; replacement: boolean; warranty: boolean; complaint: boolean } }) {
  const kinds = (['return', 'replacement', 'warranty', 'complaint'] as const).filter((k) => allowed[k]);
  const [kind, setKind] = useState<(typeof kinds)[number] | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  if (!kinds.length) return null;
  const label = { return: 'Return for a refund', replacement: 'Replace it', warranty: 'Warranty repair', complaint: 'Raise a complaint' };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {kinds.map((k) => <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => { setKind(kind === k ? null : k); setErr(null); }}>{label[k]}</button>)}
      </div>
      {kind && (
        <form className="mt-4 grid gap-4 rounded-xl border border-line p-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set('kind', kind);
          start(async () => {
            const r = await requestService(number, fd, guestKey);
            if (!r.ok) { setErr(r.error); return; }
            toast(`Request ${r.number} sent. We reply within one working day.`);
            setKind(null);
            router.refresh();
          });
        }}>
          {kind !== 'complaint' || items.length > 1 ? (
            <div>
              <label htmlFor="sr-item" className="label">Which laptop?</label>
              <select id="sr-item" name="orderItemId" className="field" required={kind !== 'complaint'}>
                {kind === 'complaint' && <option value="">The whole order</option>}
                {items.map((i) => <option key={i.id} value={i.id}>{i.title}{i.unitCode ? ` (${i.unitCode})` : ''}</option>)}
              </select>
            </div>
          ) : <input type="hidden" name="orderItemId" value={items[0]?.id ?? ''} />}
          <div>
            <label htmlFor="sr-reason" className="label">Reason</label>
            <select id="sr-reason" name="reason" className="field" required defaultValue="">
              <option value="" disabled>Choose a reason</option>
              {REASONS[kind].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sr-details" className="label">What happened?</label>
            <textarea id="sr-details" name="details" className="field" required minLength={10} placeholder="A few sentences help us sort it out faster." />
          </div>
          <div>
            <label htmlFor="sr-photos" className="label">Photos (optional, up to 4)</label>
            <input id="sr-photos" name="photos" type="file" accept="image/*" multiple className="text-[14px]" />
            <p className="hint">Photos of the problem, the box or the label help. Location data is removed.</p>
          </div>
          {err && <p className="error-text" role="alert">{err}</p>}
          <div><button className="btn btn-primary" disabled={pending}>{pending ? 'Sending…' : 'Send request'}</button></div>
        </form>
      )}
    </div>
  );
}

export function ReviewForm({ number, products }: { number: string; products: { id: string; title: string }[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done) return <p className="rounded-xl bg-ok-soft p-4 text-[14.5px] text-ok">Thanks! Your review will appear once we’ve checked it (usually within a day).</p>;
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (!rating) { setErr('Choose a star rating.'); return; } start(async () => { const r = await submitReview(number, { productId, rating, title, body }); if (!r.ok) setErr(r.error); else setDone(true); }); }}>
      {products.length > 1 && (
        <div><label htmlFor="rv-p" className="label">Laptop</label><select id="rv-p" className="field" value={productId} onChange={(e) => setProductId(e.target.value)}>{products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
      )}
      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" onClick={() => setRating(s)} aria-label={`${s} star${s > 1 ? 's' : ''}`} aria-pressed={rating === s} className="p-1">
              <Star size={26} className={s <= rating ? 'fill-ink text-ink' : 'text-line-2'} aria-hidden="true" />
            </button>
          ))}
        </div>
      </fieldset>
      <div><label htmlFor="rv-t" className="label">Title (optional)</label><input id="rv-t" className="field" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><label htmlFor="rv-b" className="label">Your review</label><textarea id="rv-b" className="field" maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="How is the condition, battery, keyboard? Would you recommend it?" /></div>
      {err && <p className="error-text" role="alert">{err}</p>}
      <div><button className="btn btn-primary" disabled={pending}>{pending ? 'Sending…' : 'Submit review'}</button></div>
    </form>
  );
}
