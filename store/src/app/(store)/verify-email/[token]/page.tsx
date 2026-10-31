import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { confirmEmailToken } from '@/lib/auth/verify';

export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function VerifyEmail({ params }: { params: Promise<{ token: string }> }) {
  const ok = await confirmEmailToken((await params).token);
  return (
    <div className="wrap-narrow py-20 text-center">
      {ok ? <CheckCircle2 size={44} className="mx-auto" aria-hidden="true" /> : <XCircle size={44} className="mx-auto text-bad" aria-hidden="true" />}
      <h1 className="mt-5 text-[34px]">{ok ? 'Email confirmed' : 'This link didn’t work'}</h1>
      <p className="mx-auto mt-3 max-w-[48ch] text-mute">{ok ? 'Thanks. Receipts and order updates will come to this address, and you can use it to reset your password.' : 'It may have expired or been used already. You can send a new one from your profile.'}</p>
      <Link href="/account" className="btn btn-primary mt-8">Go to your account</Link>
    </div>
  );
}
