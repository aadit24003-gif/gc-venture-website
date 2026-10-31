import type { Metadata } from 'next';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import TrackForm from './TrackForm';

export const metadata: Metadata = { title: 'Track an order' };

export default function TrackPage() {
  return (
    <AuthShell title="Track an order" intro={<>Enter your order number and the email or mobile number you ordered with. Have an account? <Link href="/login?next=/account/orders" className="underline">Sign in</Link> to see all your orders.</>}>
      <TrackForm />
    </AuthShell>
  );
}
