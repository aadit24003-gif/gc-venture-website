import type { Metadata } from 'next';
import { getViewer } from '@/lib/auth/session';
import LoginPanel from './LoginPanel';
import { POLICY, STUDENT } from '@/lib/config';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

const safeNext = (n?: string) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/account');

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  // Not a server redirect: signing in sets a cookie, which re-renders this page mid-flow.
  const signedIn = !!(await getViewer());
  return (
    <div className="wrap grid gap-8 pb-10 pt-8 md:pt-14 lg:grid-cols-[1fr_0.9fr] lg:items-stretch">
      <div className="sheet px-6 py-10 md:px-14 md:py-14">
        <div className="max-w-[460px]">
          <LoginPanel next={next} signedIn={signedIn} />
        </div>
      </div>
      <aside className="relative hidden overflow-hidden rounded-[32px] bg-spruce p-12 text-white/85 lg:block">
        <h2 className="max-w-[16ch] text-[40px] text-white">One account for your orders, warranty and student price.</h2>
        <ul className="mt-8 space-y-4 text-[16.5px]">
          <li>Track every order from packing to your door.</li>
          <li>Claim your {POLICY.warrantyMonths}-month warranty without hunting for an invoice.</li>
          <li>Verify your student ID once and get {STUDENT.percent}% off for a year.</li>
        </ul>
        <div className="qc-shadow absolute -bottom-6 right-10 rotate-[8deg]">
          <div className="qc-tag [--hole:var(--color-spruce)] [--tag-w:220px] text-center">
            <p className="display text-[15px] font-bold">Sign-in takes</p>
            <p className="price mt-1 text-[38px] leading-none">30 s</p>
            <p className="mt-2 pb-8 text-[13px] font-semibold">No password needed</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
