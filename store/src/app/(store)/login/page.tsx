import type { Metadata } from 'next';
import { getViewer } from '@/lib/auth/session';
import AuthShell from '@/components/auth/AuthShell';
import SignIn from './SignIn';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

const safeNext = (n?: string) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/account');

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const signedIn = !!(await getViewer());
  return (
    <AuthShell title="Sign in" intro="With a one-time code to your mobile or email, or with your password.">
      <SignIn next={next} signedIn={signedIn} />
    </AuthShell>
  );
}
