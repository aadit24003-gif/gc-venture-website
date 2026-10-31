'use client';

import { useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import { sendMessage } from './actions';

const TOPICS = ['Buying advice', 'Bulk or business order', 'An existing order', 'Warranty or repair', 'Something else'] as const;

export default function ContactForm() {
  const [f, setF] = useState({ name: '', contact: '', topic: TOPICS[0] as (typeof TOPICS)[number], body: '', website: '' });
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div className="flex flex-col items-start">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pass text-white"><Check size={24} strokeWidth={3} /></span>
        <p className="display mt-4 text-[24px] font-semibold text-spruce">Message sent</p>
        <p className="mt-2 text-mute">We reply within one working day, usually much sooner.</p>
      </div>
    );
  }

  const err = (k: string) => (error?.field === k ? <p className="error-text">{error.text}</p> : null);
  return (
    <form className="grid gap-4 sm:grid-cols-2" noValidate onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        setError(null);
        const r = await sendMessage(f);
        if (!r.ok) { setError({ text: r.error, field: 'field' in r ? r.field : undefined }); return; }
        setSent(true);
      });
    }}>
      <div><label htmlFor="m-name" className="label">Your name</label><input id="m-name" className="field" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />{err('name')}</div>
      <div><label htmlFor="m-contact" className="label">Phone or email</label><input id="m-contact" className="field" autoComplete="email" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} />{err('contact')}</div>
      <div className="sm:col-span-2">
        <label htmlFor="m-topic" className="label">About</label>
        <select id="m-topic" className="field" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value as (typeof TOPICS)[number] })}>
          {TOPICS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2"><label htmlFor="m-body" className="label">Message</label><textarea id="m-body" className="field min-h-[140px]" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="For orders, include the order number." />{err('body')}</div>
      <div className="hidden" aria-hidden><label htmlFor="m-web">Website</label><input id="m-web" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></div>
      {error && !['name', 'contact', 'body'].includes(error.field ?? '') && <p className="error-text sm:col-span-2" role="alert">{error.text}</p>}
      <button className="btn btn-primary btn-lg sm:col-span-2 sm:justify-self-start" disabled={pending}>{pending ? 'Sending…' : 'Send message'}</button>
    </form>
  );
}
