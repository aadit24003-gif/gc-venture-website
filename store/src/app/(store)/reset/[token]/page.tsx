import type { Metadata } from 'next';
import Link from 'next/link';
import { peekToken } from '@/lib/auth/tokens';
import AuthShell from '@/components/auth/AuthShell';
import ResetForm from './ResetForm';

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Reset({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = !!(await peekToken(token, 'reset_password'));
  return (
    <AuthShell title="Choose a new password">
      {valid ? <ResetForm token={token} /> : <div><p className="rounded-xl bg-bad-soft p-4 text-bad">This link has expired or was already used.</p><Link href="/forgot" className="btn btn-primary mt-5">Send a new link</Link></div>}
    </AuthShell>
  );
}
