import type { Metadata } from 'next';
import AuthShell from '@/components/auth/AuthShell';
import ForgotForm from './ForgotForm';

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } };

export default function Forgot() {
  return (
    <AuthShell title="Reset your password" intro="Enter the email on your account and we’ll send a link to choose a new password. No email on the account? Sign in with a one-time code to your mobile instead.">
      <ForgotForm />
    </AuthShell>
  );
}
