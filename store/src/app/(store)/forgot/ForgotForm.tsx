'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { requestPasswordReset } from '../login/actions';

export default function ForgotForm() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return msg ? (
    <div><p className="rounded-xl bg-canvas p-4 text-[15px]" role="status">{msg}</p><Link href="/login" className="btn btn-ghost mt-5">Back to sign in</Link></div>
  ) : (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => setMsg((await requestPasswordReset(email)).message)); }}>
      <div><label htmlFor="f-email" className="label">Email</label><input id="f-email" type="email" className="field" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <button className="btn btn-primary btn-lg w-full" disabled={pending}>{pending ? 'Sending…' : 'Send reset link'}</button>
      <p className="text-[14px] text-mute"><Link href="/login" className="underline">Back to sign in</Link></p>
    </form>
  );
}
