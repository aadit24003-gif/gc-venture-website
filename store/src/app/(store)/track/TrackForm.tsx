'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { lookupOrder } from './actions';

export default function TrackForm() {
  const router = useRouter();
  const [number, setNumber] = useState('');
  const [contact, setContact] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { setErr(null); const r = await lookupOrder(number, contact); if (!r.ok) setErr(r.error); else router.push(r.href); }); }}>
      <div><label htmlFor="t-n" className="label">Order number</label><input id="t-n" className="field mono uppercase" placeholder="EN-261031-ABCD" value={number} onChange={(e) => setNumber(e.target.value)} required /></div>
      <div><label htmlFor="t-c" className="label">Email or mobile used on the order</label><input id="t-c" className="field" value={contact} onChange={(e) => setContact(e.target.value)} required /></div>
      {err && <p className="error-text" role="alert">{err}</p>}
      <button className="btn btn-primary btn-lg w-full" disabled={pending}>{pending ? 'Looking…' : 'Track order'}</button>
    </form>
  );
}
