'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoginFlow from '@/components/auth/LoginFlow';

export default function LoginPanel({ next, signedIn, compact }: { next: string; signedIn: boolean; compact?: boolean }) {
  const router = useRouter();
  // Only the state on arrival counts: someone already signed in goes straight on.
  const [arrivedSignedIn] = useState(signedIn);
  useEffect(() => { if (arrivedSignedIn) router.replace(next); }, [arrivedSignedIn, next, router]);
  if (arrivedSignedIn) return <p className="text-mute">You’re already signed in. Taking you on…</p>;
  return <LoginFlow compact={compact} onDone={() => { router.replace(next); router.refresh(); }} />;
}
