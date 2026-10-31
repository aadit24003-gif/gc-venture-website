import type { Metadata } from 'next';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import { hmac, safeEqual } from '@/lib/auth/secret';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false } };

/** One-click unsubscribe from the link in every newsletter email (signed, so links can't be guessed). */
export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ e?: string; t?: string }> }) {
  const { e = '', t = '' } = await searchParams;
  const email = e.trim().toLowerCase();
  const ok = !!email && !!t && safeEqual(hmac('unsubscribe', email).slice(0, 24), t);
  if (ok) {
    const d = await db();
    await d.update(subscribers).set({ status: 'unsubscribed', unsubscribedAt: new Date() }).where(eq(subscribers.email, email));
  }
  return (
    <div className="wrap-narrow py-20 text-center">
      <h1 className="text-[34px]">{ok ? 'You’re unsubscribed' : 'This link didn’t work'}</h1>
      <p className="mx-auto mt-3 max-w-[46ch] text-mute">{ok ? `${email} won’t get the newsletter any more. Order emails still arrive when you buy.` : 'It may be incomplete. Reply to any newsletter email and we’ll remove you by hand.'}</p>
      <Link href="/" className="btn btn-primary mt-8">Back to the store</Link>
    </div>
  );
}
