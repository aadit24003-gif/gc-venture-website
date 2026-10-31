'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { markMessageHandled } from '../actions';

export default function MarkHandled({ id }: { id: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <button type="button" className="btn btn-ghost btn-sm mt-3" disabled={pending} onClick={() => start(async () => { await markMessageHandled(id); router.refresh(); })}>Mark as answered</button>;
}
