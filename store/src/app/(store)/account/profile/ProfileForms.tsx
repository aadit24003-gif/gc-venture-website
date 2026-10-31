'use client';

import { useState, useTransition } from 'react';
import { changeEmail, confirmPhone, sendPhoneCode, setPassword, signOutEverywhere, updateProfile } from '../actions';
import { resendVerification } from '../../login/actions';
import { toast } from '@/components/Toaster';
import CodeInput from '@/components/auth/CodeInput';

export function ResendVerification() {
  const [pending, start] = useTransition();
  return <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { const r = await resendVerification(); toast(r.message, r.ok ? 'ok' : 'error'); })}>{pending ? 'Sending…' : 'Send link again'}</button>;
}

export function NameForm({ name: n, marketing: m }: { name: string; marketing: boolean }) {
  const [name, setName] = useState(n);
  const [marketing, setMarketing] = useState(m);
  const [pending, start] = useTransition();
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await updateProfile({ name, marketing }); toast(r.ok ? r.message ?? 'Saved' : r.error, r.ok ? 'ok' : 'error'); }); }}>
      <div className="max-w-[420px]"><label htmlFor="pf-name" className="label">Full name</label><input id="pf-name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="check" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /> Email me when good units arrive (at most twice a month)</label>
      <div><button className="btn btn-primary btn-sm" disabled={pending}>Save</button></div>
    </form>
  );
}

export function EmailForm({ email: e0, verified }: { email: string; verified: boolean }) {
  const [email, setEmail] = useState(e0);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={(ev) => { ev.preventDefault(); start(async () => { setErr(null); const r = await changeEmail(email); if (!r.ok) setErr(r.error); else toast(r.message ?? 'Saved'); }); }}>
      <div className="min-w-[240px] flex-1"><label htmlFor="pf-email" className="label">Email address</label><input id="pf-email" type="email" className="field" autoComplete="email" value={email} onChange={(ev) => setEmail(ev.target.value)} />{err && <p className="error-text">{err}</p>}</div>
      <button className="btn btn-primary btn-sm !min-h-[46px]" disabled={pending}>{email === e0 && e0 && !verified ? 'Resend confirmation' : 'Save'}</button>
    </form>
  );
}

export function PhoneForm({ phone: p0 }: { phone: string }) {
  const [phone, setPhone] = useState(p0);
  const [sent, setSent] = useState<{ masked: string; demoCode?: string } | null>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (sent) {
    return (
      <div>
        <p className="text-[14.5px]">Enter the code we sent to {sent.masked}.{sent.demoCode ? <span className="ml-1 rounded bg-accent-soft px-1.5 text-[13px]">Demo code: <b className="mono">{sent.demoCode}</b></span> : null}</p>
        <div className="mt-3 max-w-[340px]"><CodeInput value={code} onChange={setCode} onComplete={(c) => start(async () => { const r = await confirmPhone(phone, c); if (!r.ok) setErr(r.error); else { toast(r.message ?? 'Confirmed'); setSent(null); setCode(''); } })} disabled={pending} invalid={!!err} /></div>
        {err && <p className="error-text">{err}</p>}
        <button type="button" className="mt-3 text-[14px] underline" onClick={() => { setSent(null); setErr(null); }}>Use a different number</button>
      </div>
    );
  }
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); start(async () => { setErr(null); const r = await sendPhoneCode(phone); if (!r.ok) setErr(r.error); else setSent(r); }); }}>
      <div className="min-w-[220px] flex-1"><label htmlFor="pf-phone" className="label">Mobile number</label><input id="pf-phone" className="field" inputMode="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} />{err && <p className="error-text">{err}</p>}</div>
      <button className="btn btn-primary btn-sm !min-h-[46px]" disabled={pending}>{pending ? 'Sending…' : 'Send code to confirm'}</button>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [err, setErr] = useState<{ text: string; field?: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="grid max-w-[420px] gap-4" onSubmit={(e) => { e.preventDefault(); start(async () => { setErr(null); const r = await setPassword(cur, next); if (!r.ok) setErr({ text: r.error, field: r.field }); else { toast(r.message ?? 'Saved'); setCur(''); setNext(''); } }); }}>
      {hasPassword && <div><label htmlFor="pw-c" className="label">Current password</label><input id="pw-c" type="password" className="field" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />{err?.field === 'current' && <p className="error-text">{err.text}</p>}</div>}
      <div><label htmlFor="pw-n" className="label">New password</label><input id="pw-n" type="password" className="field" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} /><p className="hint">At least 8 characters.</p>{err?.field === 'next' && <p className="error-text">{err.text}</p>}</div>
      {err && !err.field && <p className="error-text">{err.text}</p>}
      <div><button className="btn btn-primary btn-sm" disabled={pending}>{hasPassword ? 'Change password' : 'Set password'}</button></div>
    </form>
  );
}

export function SessionsForm() {
  const [pending, start] = useTransition();
  return <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { const r = await signOutEverywhere(); toast(r.ok ? r.message ?? 'Done' : r.error, r.ok ? 'ok' : 'error'); })}>Sign out of other devices</button>;
}
