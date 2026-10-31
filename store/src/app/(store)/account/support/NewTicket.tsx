'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { openTicket, replyTicket } from '../actions';

export default function NewTicket({ categories, orders }: { categories: Record<string, string>; orders: string[] }) {
  const router = useRouter();
  const [f, setF] = useState({ category: 'order', subject: '', body: '', orderNumber: '' });
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await openTicket(f); if (!r.ok) setErr(r.error); else router.push(`/account/support/${r.number}`); }); }}>
      <div><label htmlFor="t-cat" className="label">Topic</label><select id="t-cat" className="field" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{Object.entries(categories).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      {orders.length > 0 && <div><label htmlFor="t-ord" className="label">Order (optional)</label><select id="t-ord" className="field" value={f.orderNumber} onChange={(e) => setF({ ...f, orderNumber: e.target.value })}><option value="">Not about an order</option>{orders.map((o) => <option key={o}>{o}</option>)}</select></div>}
      <div><label htmlFor="t-sub" className="label">Subject</label><input id="t-sub" className="field" maxLength={140} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
      <div><label htmlFor="t-body" className="label">Message</label><textarea id="t-body" className="field" maxLength={5000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
      {err && <p className="error-text" role="alert">{err}</p>}
      <div><button className="btn btn-primary" disabled={pending}>{pending ? 'Sending…' : 'Send'}</button></div>
    </form>
  );
}

export function Reply({ number }: { number: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="mt-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await replyTicket(number, body); if (!r.ok) setErr(r.error); else { setBody(''); router.refresh(); } }); }}>
      <label htmlFor="rep" className="label">Reply</label>
      <textarea id="rep" className="field" value={body} onChange={(e) => setBody(e.target.value)} />
      {err && <p className="error-text">{err}</p>}
      <button className="btn btn-primary mt-3" disabled={pending}>{pending ? 'Sending…' : 'Send reply'}</button>
    </form>
  );
}
