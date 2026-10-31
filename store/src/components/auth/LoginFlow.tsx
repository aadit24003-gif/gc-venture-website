'use client';

import { useEffect, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Mail, Smartphone } from 'lucide-react';
import { requestLoginCode, saveName, verifyLoginCode } from '@/app/login/actions';
import CodeInput from './CodeInput';

type Step = 'ask' | 'code' | 'name';

/** Sign in or sign up with a one-time code sent to a mobile number or email. */
export default function LoginFlow({ onDone, compact }: { onDone: () => void; compact?: boolean }) {
  const [step, setStep] = useState<Step>('ask');
  const [raw, setRaw] = useState('');
  const [dest, setDest] = useState<{ destination: string; channel: 'sms' | 'email'; masked: string; demoCode?: string } | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [pending, start] = useTransition();

  const kind = raw.includes('@') ? 'email' : /\d{3,}/.test(raw) ? 'phone' : null;

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = () => start(async () => {
    setError(null);
    const res = await requestLoginCode(raw);
    if (!res.ok) { setError(res.error); return; }
    setDest(res);
    setCode('');
    setWait(30);
    setStep('code');
  });

  const verify = (c = code) => start(async () => {
    if (!dest) return;
    setError(null);
    const res = await verifyLoginCode(dest.destination, c);
    if (!res.ok) { setError(res.error); setCode(''); return; }
    if (res.needsName) setStep('name');
    else onDone();
  });

  const finish = () => start(async () => {
    if (!name.trim()) { onDone(); return; }
    const res = await saveName(name);
    if (!res.ok) { setError(res.error ?? 'Could not save your name.'); return; }
    onDone();
  });

  const slide = { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 }, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {step === 'ask' && (
          <motion.form key="ask" {...slide} onSubmit={(e) => { e.preventDefault(); send(); }} noValidate>
            {!compact && <h1 className="text-[34px] md:text-[42px]">Sign in or create an account</h1>}
            <p className={`${compact ? '' : 'mt-3'} text-[16px] text-mute`}>We’ll send a 6-digit code. No password to remember.</p>
            <label htmlFor="dest" className="label mt-7">Mobile number or email</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" aria-hidden>
                {kind === 'email' ? <Mail size={19} /> : <Smartphone size={19} />}
              </span>
              <input
                id="dest" value={raw} onChange={(e) => { setRaw(e.target.value); setError(null); }}
                className="field !min-h-[56px] !pl-12 text-[17px]" placeholder="98765 43210 or you@example.com"
                autoComplete="username" inputMode={kind === 'email' ? 'email' : 'text'} autoFocus={!compact}
                aria-invalid={!!error} aria-describedby={error ? 'dest-err' : 'dest-hint'}
              />
            </div>
            {error ? <p id="dest-err" className="error-text" role="alert">{error}</p> : <p id="dest-hint" className="hint">Indian mobile numbers get the code by SMS.</p>}
            <button className="btn btn-primary btn-lg mt-6 w-full" disabled={pending || !raw.trim()}>{pending ? 'Sending…' : 'Send code'}</button>
            <p className="mt-4 text-[13.5px] text-mute">By continuing you agree to our <a href="/terms" className="link">terms of sale</a> and <a href="/privacy" className="link">privacy policy</a>.</p>
          </motion.form>
        )}

        {step === 'code' && dest && (
          <motion.form key="code" {...slide} onSubmit={(e) => { e.preventDefault(); verify(); }}>
            {!compact && <h1 className="text-[34px] md:text-[42px]">Enter your code</h1>}
            <p className={`${compact ? '' : 'mt-3'} text-[16px] text-mute`}>
              Sent to <span className="font-semibold text-ink">{dest.masked}</span> by {dest.channel === 'sms' ? 'SMS' : 'email'}.{' '}
              <button type="button" className="link" onClick={() => { setStep('ask'); setError(null); }}>Change</button>
            </p>
            {dest.demoCode && (
              <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-tag-soft px-4 py-3 text-[14.5px]">
                <span>Demo mode, no message was sent. Your code is <span className="num font-bold tracking-widest">{dest.demoCode}</span></span>
                <button type="button" className="btn btn-sm btn-tag" onClick={() => { setCode(dest.demoCode!); verify(dest.demoCode!); }}>Use it</button>
              </div>
            )}
            <div className="mt-6"><CodeInput value={code} onChange={(v) => { setCode(v); setError(null); }} onComplete={(v) => verify(v)} disabled={pending} invalid={!!error} /></div>
            {error && <p className="error-text" role="alert">{error}</p>}
            <button className="btn btn-primary btn-lg mt-6 w-full" disabled={pending || code.length < 6}>{pending ? 'Checking…' : 'Continue'}</button>
            <p className="mt-4 text-[14.5px] text-mute">
              Didn’t get it?{' '}
              {wait > 0 ? <span>Send again in {wait} s</span> : <button type="button" className="link" onClick={send} disabled={pending}>Send a new code</button>}
            </p>
          </motion.form>
        )}

        {step === 'name' && (
          <motion.form key="name" {...slide} onSubmit={(e) => { e.preventDefault(); finish(); }}>
            {!compact && <h1 className="text-[34px] md:text-[42px]">Welcome. What’s your name?</h1>}
            {compact && <p className="text-[18px] font-semibold text-spruce">Welcome. What’s your name?</p>}
            <p className="mt-3 text-[16px] text-mute">It goes on your invoice and the delivery label.</p>
            <label htmlFor="name" className="label mt-7">Full name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} className="field !min-h-[56px] text-[17px]" autoComplete="name" autoFocus />
            {error && <p className="error-text" role="alert">{error}</p>}
            <button className="btn btn-primary btn-lg mt-6 w-full" disabled={pending}>{pending ? 'Saving…' : 'Continue'}</button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
