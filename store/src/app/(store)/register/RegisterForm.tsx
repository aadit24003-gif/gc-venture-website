'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { registerAccount } from '../login/actions';

export default function RegisterForm({ next, email: initialEmail }: { next: string; email: string }) {
  const router = useRouter();
  const [f, setF] = useState({ name: '', email: initialEmail, phone: '', password: '', marketing: false });
  const [err, setErr] = useState<{ text: string; field?: string } | null>(null);
  const [pending, start] = useTransition();
  const e = (k: string) => (err?.field === k ? err.text : null);
  return (
    <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); start(async () => { setErr(null); const r = await registerAccount(f); if (!r.ok) setErr({ text: r.error, field: r.field }); else { router.replace(`${next}${next.includes('?') ? '&' : '?'}welcome=1`); router.refresh(); } }); }}>
      <div><label htmlFor="r-name" className="label">Full name</label><input id="r-name" className="field" autoComplete="name" value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} required aria-invalid={!!e('name')} />{e('name') && <p className="error-text">{e('name')}</p>}</div>
      <div><label htmlFor="r-email" className="label">Email</label><input id="r-email" type="email" className="field" autoComplete="email" value={f.email} onChange={(x) => setF({ ...f, email: x.target.value })} required aria-invalid={!!e('email')} />{e('email') && <p className="error-text">{e('email')}</p>}</div>
      <div><label htmlFor="r-phone" className="label">Mobile number <span className="font-normal text-mute">(optional, for delivery updates)</span></label><input id="r-phone" className="field" inputMode="tel" autoComplete="tel-national" value={f.phone} onChange={(x) => setF({ ...f, phone: x.target.value })} aria-invalid={!!e('phone')} />{e('phone') && <p className="error-text">{e('phone')}</p>}</div>
      <div><label htmlFor="r-pw" className="label">Password</label><input id="r-pw" type="password" className="field" autoComplete="new-password" minLength={8} value={f.password} onChange={(x) => setF({ ...f, password: x.target.value })} required aria-describedby="r-pw-hint" aria-invalid={!!e('password')} /><p id="r-pw-hint" className="hint">At least 8 characters. A short phrase is easiest to remember.</p>{e('password') && <p className="error-text">{e('password')}</p>}</div>
      <label className="flex items-start gap-2 text-[14px]"><input type="checkbox" className="check mt-0.5" checked={f.marketing} onChange={(x) => setF({ ...f, marketing: x.target.checked })} /> Email me when good units arrive (at most twice a month).</label>
      {err && !err.field && <p className="error-text" role="alert">{err.text}</p>}
      <button className="btn btn-primary btn-lg w-full" disabled={pending}>{pending ? 'Creating your account…' : 'Create account'}</button>
      <p className="text-[13px] text-mute">By creating an account you agree to the <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>. We’ll email a link to confirm your address.</p>
      <p className="border-t border-line pt-5 text-[14.5px] text-mute">Already have an account? <Link href="/login" className="font-semibold text-ink underline">Sign in</Link></p>
    </form>
  );
}
