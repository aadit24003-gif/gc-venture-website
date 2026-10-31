import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth/session';
import AccountNav from './AccountNav';

export const dynamic = 'force-dynamic';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const v = await getViewer();
  if (!v) redirect('/login?next=/account');
  return (
    <div className="wrap grid gap-8 pb-16 pt-8 md:pt-12 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside>
        <div className="lg:sticky lg:top-[132px]">
          <p className="truncate text-[18px] font-semibold">{v.user.name ?? 'Your account'}</p>
          <p className="truncate text-[13.5px] text-mute">{v.user.email ?? v.user.phone}</p>
          <AccountNav staff={v.isStaff} />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
