'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { resetPassword } from '../../login/actions';

export default function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (pw !== pw2) { setErr('The two passwords don’t match.'); return; } start(async () => { const r = await resetPassword(token, pw); if (!r.ok) setErr(r.error); else { router.replace('/account?notice=password'); router.refresh(); } }); }}>
      <div><label htmlFor="n-pw" className="label">New password</label><input id="n-pw" type="password" className="field" autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} /><p className="hint">At least 8 characters.</p></div>
      <div><label htmlFor="n-pw2" className="label">Type it again</label><input id="n-pw2" type="password" className="field" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
      {err && <p className="error-text" role="alert">{err}</p>}
      <button className="btn btn-primary btn-lg w-full" disabled={pending}>{pending ? 'Saving…' : 'Save password and sign in'}</button>
      <p className="text-[13px] text-mute">You’ll be signed out on other devices.</p>
    </form>
  );
}
