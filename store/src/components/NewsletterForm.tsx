'use client';

import { useState, useTransition } from 'react';
import { subscribe } from '@/app/(store)/newsletter/actions';

export default function NewsletterForm({ tone = 'dark', source = 'footer' }: { tone?: 'dark' | 'light'; source?: string }) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dark = tone === 'dark';
  return (
    <form
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await subscribe(email, source);
          setMsg({ ok: r.ok, text: r.message });
          if (r.ok) setEmail('');
        });
      }}
    >
      <label htmlFor={`nl-${source}`} className="sr-only">Email address</label>
      <div className={`flex gap-2 rounded-xl p-1.5 ${dark ? 'bg-white/10' : 'border border-line-2 bg-white focus-within:border-accent'}`}>
        <input id={`nl-${source}`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
          className={`h-11 min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none ${dark ? 'text-white placeholder:text-white/50' : 'placeholder:text-faint'}`} />
        <button type="submit" disabled={pending} className="btn btn-accent h-11 min-h-0">{pending ? 'Adding…' : 'Subscribe'}</button>
      </div>
      <p role="status" className={`mt-2 min-h-[20px] text-[13px] ${msg ? (msg.ok ? (dark ? 'text-white/80' : 'text-ok') : 'text-[#ff8a8f]') : ''}`}>{msg?.text}</p>
    </form>
  );
}
