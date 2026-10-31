'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveName } from '../login/actions';
import { toast } from '@/components/Toaster';

export default function NameForm({ initial }: { initial: string }) {
  const [name, setName] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="mt-4 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveName(name);
          if (r.ok) { toast('Name saved'); router.refresh(); } else toast(r.error ?? 'Could not save', 'error');
        });
      }}
    >
      <label htmlFor="pname" className="sr-only">Full name</label>
      <input id="pname" className="field !min-h-[44px]" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoComplete="name" />
      <button className="btn btn-ghost btn-sm !min-h-[44px]" disabled={pending || name.trim() === initial}>Save</button>
    </form>
  );
}
