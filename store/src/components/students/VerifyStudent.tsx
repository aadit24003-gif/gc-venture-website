'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, Check, Clock, IdCard, Mail, Upload } from 'lucide-react';
import LoginFlow from '../auth/LoginFlow';
import CodeInput from '../auth/CodeInput';
import { confirmCollegeCode, sendCollegeCode, submitStudentId } from '@/app/(store)/students/actions';
import { STUDENT } from '@/lib/config';
import { formatDate } from '@/lib/format';

type State = { signedIn: false } | { signedIn: true; state: 'approved' | 'pending' | 'rejected' | 'none'; until: string | null; reason: string | null };

export default function VerifyStudent({ initial }: { initial: State }) {
  const router = useRouter();
  const [tab, setTab] = useState<'email' | 'id'>('email');

  if (!initial.signedIn) {
    return (
      <div className="max-w-[480px]">
        <p className="text-[18px] font-semibold text-spruce">First, sign in or create an account</p>
        <p className="mb-6 mt-1 text-mute">Your student status is saved to your account, so the discount applies whenever you check out.</p>
        <LoginFlow compact onDone={() => router.refresh()} />
      </div>
    );
  }
  if (initial.state === 'approved') {
    return (
      <Done title="You’re verified" body={`${STUDENT.percent}% off applies automatically at checkout${initial.until ? ` until ${formatDate(initial.until)}` : ''}.`}>
        <Link href="/laptops?use=study" className="btn btn-primary mt-6">Find your laptop</Link>
      </Done>
    );
  }
  if (initial.state === 'pending') {
    return (
      <Done icon={<Clock size={26} />} tone="wait" title="We’re checking your ID" body="Usually within one working day. We’ll email you, and the discount switches on by itself once approved.">
        <Link href="/laptops" className="btn btn-ghost mt-6">Keep browsing</Link>
      </Done>
    );
  }

  return (
    <div>
      {initial.state === 'rejected' && (
        <p className="mb-6 rounded-2xl bg-alert-soft px-4 py-3 text-[15px] text-alert">
          We couldn’t verify your last request{initial.reason ? `: ${initial.reason}` : '.'} You can try again below.
        </p>
      )}
      <div role="tablist" aria-label="How to verify" className="grid grid-cols-2 gap-2 rounded-[20px] bg-bench p-1.5">
        {([
          { k: 'email', icon: Mail, title: 'College email', note: 'Instant' },
          { k: 'id', icon: IdCard, title: 'Student ID photo', note: 'Within 1 working day' },
        ] as const).map((t) => (
          <button key={t.k} type="button" role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors aria-selected:bg-white aria-selected:shadow-[0_6px_16px_-10px_rgba(15,61,51,.4)]">
            <t.icon size={22} className="shrink-0 text-spruce" />
            <span><span className="block font-semibold text-spruce">{t.title}</span><span className="block text-[13px] text-mute">{t.note}</span></span>
          </button>
        ))}
      </div>
      <div className="mt-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {tab === 'email' ? <EmailRoute onDone={() => router.refresh()} /> : <IdRoute onDone={() => router.refresh()} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Done({ title, body, children, icon, tone = 'ok' }: { title: string; body: string; children?: React.ReactNode; icon?: React.ReactNode; tone?: 'ok' | 'wait' }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-start">
      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone === 'ok' ? 'bg-pass text-white' : 'bg-tag text-spruce'}`}>{icon ?? <Check size={28} strokeWidth={3} />}</span>
      <p className="mt-4 text-[26px] font-semibold text-spruce display">{title}</p>
      <p className="mt-2 max-w-[52ch] text-[16px] text-mute">{body}</p>
      {children}
    </motion.div>
  );
}

function EmailRoute({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ fullName: '', college: '', email: '' });
  const [sent, setSent] = useState<{ masked: string; academic: boolean; demoCode?: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [result, setResult] = useState<'approved' | 'pending' | null>(null);
  const [pending, start] = useTransition();

  if (result) {
    return result === 'approved'
      ? <Done title="You’re verified" body={`${STUDENT.percent}% off now applies automatically at checkout, for ${STUDENT.validityMonths} months.`}><button type="button" className="btn btn-primary mt-6" onClick={onDone}>Continue</button></Done>
      : <Done icon={<Clock size={26} />} tone="wait" title="Email confirmed, now a quick check" body="Your college uses an email domain we don’t recognise automatically, so a person will confirm it within one working day."><button type="button" className="btn btn-ghost mt-6" onClick={onDone}>Done</button></Done>;
  }

  const verify = (c: string) => start(async () => {
    setError(null);
    const r = await confirmCollegeCode({ ...form, code: c });
    if (!r.ok) { setError({ text: r.error }); setCode(''); return; }
    setResult(r.approved ? 'approved' : 'pending');
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (sent) verify(code); else start(async () => {
      setError(null);
      const r = await sendCollegeCode(form);
      if (!r.ok) { setError({ text: r.error, field: 'field' in r ? r.field : undefined }); return; }
      setSent(r);
    }); }} noValidate>
      {!sent ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="e-name" label="Full name, as on your ID" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} err={error?.field === 'fullName' ? error.text : null} autoComplete="name" />
          <Input id="e-college" label="College or university" value={form.college} onChange={(v) => setForm({ ...form, college: v })} err={error?.field === 'college' ? error.text : null} />
          <div className="sm:col-span-2">
            <Input id="cemail" label="College email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} err={error?.field === 'email' ? error.text : null} placeholder="name@college.ac.in" />
            <p className="hint">Addresses ending in .ac.in, .edu.in or .edu are approved as soon as you enter the code.</p>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-[16px]">We sent a code to <b>{sent.masked}</b>. <button type="button" className="link" onClick={() => { setSent(null); setCode(''); }}>Change</button></p>
          {sent.demoCode && (
            <p className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-tag-soft px-4 py-3 text-[14.5px]">
              <span>Demo mode: the code is <b className="num tracking-widest">{sent.demoCode}</b></span>
              <button type="button" className="btn btn-sm btn-tag" onClick={() => { setCode(sent.demoCode!); verify(sent.demoCode!); }}>Use it</button>
            </p>
          )}
          <div className="mt-5 max-w-[420px]"><CodeInput value={code} onChange={setCode} onComplete={verify} disabled={pending} invalid={!!error} /></div>
        </div>
      )}
      {error && !error.field && <p className="error-text" role="alert">{error.text}</p>}
      <button className="btn btn-primary btn-lg mt-6" disabled={pending || (!!sent && code.length < 6)}>
        {pending ? 'Working…' : sent ? 'Verify' : 'Send code to my college email'}
      </button>
    </form>
  );
}

function IdRoute({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const [previews, setPreviews] = useState<{ front?: string; back?: string }>({});
  const formRef = useRef<HTMLFormElement>(null);
  const year = new Date().getFullYear();

  if (done) return <Done icon={<Clock size={26} />} tone="wait" title="Thanks, we’ve got your ID" body="We check IDs within one working day and email you the result. Once approved, the discount applies by itself."><button type="button" className="btn btn-ghost mt-6" onClick={onDone}>Done</button></Done>;

  return (
    <form ref={formRef} onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      start(async () => {
        setError(null);
        const r = await submitStudentId(fd);
        if (!r.ok) { setError({ text: r.error, field: 'field' in r ? r.field : undefined }); return; }
        setDone(true);
      });
    }} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="i-name" name="fullName" label="Full name, as on your ID" err={error?.field === 'fullName' ? error.text : null} autoComplete="name" />
        <Input id="i-college" name="college" label="College or university" err={error?.field === 'college' ? error.text : null} />
        <Input id="i-course" name="course" label="Course (optional)" placeholder="e.g. B.Tech CSE" />
        <div>
          <label htmlFor="gradYear" className="label">Year you finish</label>
          <select id="gradYear" name="gradYear" className="field" defaultValue="">
            <option value="">Choose</option>
            {Array.from({ length: 8 }, (_, i) => year + i).map((y) => <option key={y}>{y}</option>)}
          </select>
          {error?.field === 'gradYear' && <p className="error-text">{error.text}</p>}
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {(['front', 'back'] as const).map((side) => (
          <label key={side} htmlFor={`id-${side}`} className={`relative flex min-h-[170px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[20px] border-2 border-dashed bg-bench text-center transition-colors hover:border-spruce has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-tag-2 ${error?.field === side ? 'border-alert' : 'border-line'}`}>
            {previews[side] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previews[side]} alt={`Preview of the ${side} of your ID`} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <>
                {side === 'front' ? <Camera size={26} className="text-spruce" /> : <Upload size={24} className="text-mute" />}
                <span className="mt-2 font-semibold text-spruce">{side === 'front' ? 'Front of your ID' : 'Back (optional)'}</span>
                <span className="mt-1 px-4 text-[13px] text-mute">Take a photo or choose a file. JPG or PNG, up to 8 MB.</span>
              </>
            )}
            <input id={`id-${side}`} name={side} type="file" accept="image/*" capture="environment" className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; setPreviews((p) => ({ ...p, [side]: f ? URL.createObjectURL(f) : undefined })); }} />
          </label>
        ))}
      </div>
      {(error?.field === 'front' || error?.field === 'back') && <p className="error-text" role="alert">{error.text}</p>}
      <p className="hint mt-3">Make sure your name, college and validity date are readable. We use the photo only to check your student status and delete it {STUDENT.idRetentionDays} days after deciding.</p>
      <label className="mt-5 flex items-start gap-3 text-[15px]">
        <input type="checkbox" name="consent" className="mt-1 h-[18px] w-[18px] accent-[var(--color-spruce)]" />
        <span>This is my own, current student ID.</span>
      </label>
      {error?.field === 'consent' && <p className="error-text">{error.text}</p>}
      {error && !['fullName', 'college', 'gradYear', 'front', 'back', 'consent'].includes(error.field ?? '') && <p className="error-text" role="alert">{error.text}</p>}
      <button className="btn btn-primary btn-lg mt-6" disabled={pending}>{pending ? 'Uploading…' : 'Send for checking'}</button>
    </form>
  );
}

function Input({ id, label, err, value, onChange, name, type = 'text', placeholder, autoComplete }: {
  id: string; label: string; err?: string | null; value?: string; onChange?: (v: string) => void; name?: string; type?: string; placeholder?: string; autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} name={name ?? id} type={type} className={`field ${err ? '!border-alert' : ''}`} placeholder={placeholder} autoComplete={autoComplete}
        {...(onChange ? { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) } : {})} aria-invalid={!!err} />
      {err && <p className="error-text">{err}</p>}
    </div>
  );
}
