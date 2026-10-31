import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth/session';
import AuthShell from '@/components/auth/AuthShell';
import RegisterForm from './RegisterForm';

export const metadata: Metadata = { title: 'Create an account', robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const sp = await searchParams;
  if (await getViewer()) redirect('/account');
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/account';
  return (
    <AuthShell title="Create an account" intro="Takes a minute. You can also check out as a guest, or sign in with just a one-time code.">
      <RegisterForm next={next} email={(sp.email ?? '').slice(0, 200)} />
    </AuthShell>
  );
}
