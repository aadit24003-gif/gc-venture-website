'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { usePayment } from './usePayment';
import { rupees } from '@/lib/format';

export default function PayAgain({ number, amount, guestKey }: { number: string; amount: number; guestKey?: string | null }) {
  const { pay, sheet } = usePayment();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" className="btn btn-primary" disabled={pending} onClick={() => start(async () => {
        setError(null);
        const r = await pay(number, guestKey);
        if (r.outcome === 'paid') router.refresh();
        else if (r.outcome === 'failed') setError(r.error ?? 'Payment failed.');
      })}>
        {pending ? 'Opening…' : `Pay ${rupees(amount)} now`}
      </button>
      {error && <p className="error-text" role="alert">{error}</p>}
      {sheet}
    </>
  );
}
