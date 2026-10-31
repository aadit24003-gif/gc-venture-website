'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import LoginFlow from '@/components/auth/LoginFlow';
import { loginWithPassword } from './actions';

export default function SignIn({ next, signedIn }: { next: string; signedIn: boolean }) {
  const router = useRouter();
  const [arrivedSignedIn] = useState(signedIn);
  const [mode, setMode] = useState<'code' | 'password'>('code');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => { if (arrivedSignedIn) router.replace(next); }, [arrivedSignedIn, next, router]);
  if (arrivedSignedIn) return <p className="text-mute">You’re already signed in. Taking you on…</p>;
  const done = () => { router.replace(next); router.refresh(); };
  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1" role="tablist" aria-label="Sign-in method">
        {(['code', 'password'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setErr(null); }}
            className={`h-10 rounded-lg text-[14px] font-semibold transition ${mode === m ? 'bg-white shadow-[var(--shadow-card)]' : 'text-mute hover:text-ink'}`}>
            {m === 'code' ? 'One-time code' : 'Password'}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {mode === 'code' ? (
          <LoginFlow onDone={done} />
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { setErr(null); const r = await loginWithPassword(id, pw); if (!r.ok) setErr(r.error); else done(); }); }}>
            <div><label htmlFor="li-id" className="label">Email or mobile number</label><input id="li-id" className="field" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} required /></div>
            <div>
              <div className="flex items-baseline justify-between"><label htmlFor="li-pw" className="label">Password</label><Link href="/forgot" className="text-[13px] underline">Forgot it?</Link></div>
              <div className="relative">
                <input id="li-pw" type={show ? 'text' : 'password'} className="field pr-11" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
                <button type="button" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-mute hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </div>
            {err && <p className="error-text" role="alert">{err}</p>}
            <button className="btn btn-primary btn-lg w-full" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
          </form>
        )}
      </div>
      <p className="mt-8 border-t border-line pt-6 text-[14.5px] text-mute">New here? <Link href={`/register${next !== '/account' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-ink underline">Create an account</Link>, or just enter your number or email above: a code creates one for you.</p>
    </div>
  );
}
