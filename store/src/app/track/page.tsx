import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth/session';
import LoginPanel from '../login/LoginPanel';

export const metadata: Metadata = { title: 'Track an order' };

export default async function TrackPage() {
  if (await getViewer()) redirect('/account');
  return (
    <div className="wrap max-w-[620px] pb-10 pt-10 md:pt-16">
      <div className="sheet p-7 md:p-10">
        <h1 className="text-[36px]">Track an order</h1>
        <p className="mt-3 text-mute">Sign in with the mobile number or email you ordered with. Your orders and their progress are on the next screen.</p>
        <div className="mt-8"><LoginPanel next="/account" signedIn={false} compact /></div>
      </div>
    </div>
  );
}
