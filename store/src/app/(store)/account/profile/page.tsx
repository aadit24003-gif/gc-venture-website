import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth/session';
import { formatDate } from '@/lib/format';
import { EmailForm, NameForm, PasswordForm, PhoneForm, SessionsForm } from './ProfileForms';

export const metadata: Metadata = { title: 'Profile and security', robots: { index: false } };

export default async function Profile() {
  const v = await requireViewer('/account/profile');
  const u = v.user;
  return (
    <div className="max-w-[760px]">
      <h1 className="text-[32px]">Profile and security</h1>
      <p className="mt-2 text-mute">Member since {formatDate(u.createdAt)}.</p>
      <section className="card mt-6 p-6" aria-labelledby="p-name"><h2 id="p-name" className="text-[19px]">Your details</h2><div className="mt-4"><NameForm name={u.name ?? ''} marketing={u.marketingOptIn} /></div></section>
      <section className="card mt-4 p-6" aria-labelledby="p-email">
        <h2 id="p-email" className="text-[19px]">Email {u.email && (u.emailVerifiedAt ? <span className="pill pill-ok ml-2 align-middle">Confirmed</span> : <span className="pill pill-wait ml-2 align-middle">Not confirmed</span>)}</h2>
        <div className="mt-4"><EmailForm email={u.email ?? ''} verified={!!u.emailVerifiedAt} /></div>
      </section>
      <section className="card mt-4 p-6" aria-labelledby="p-phone">
        <h2 id="p-phone" className="text-[19px]">Mobile number {u.phone && (u.phoneVerifiedAt ? <span className="pill pill-ok ml-2 align-middle">Confirmed</span> : <span className="pill pill-wait ml-2 align-middle">Not confirmed</span>)}</h2>
        <div className="mt-4"><PhoneForm phone={u.phone ?? ''} /></div>
      </section>
      <section className="card mt-4 p-6" aria-labelledby="p-pw"><h2 id="p-pw" className="text-[19px]">{u.passwordHash ? 'Change password' : 'Set a password'}</h2><p className="mt-1 text-[14px] text-mute">{u.passwordHash ? 'Changing it signs you out on other devices.' : 'Optional. You can always sign in with a one-time code instead.'}</p><div className="mt-4"><PasswordForm hasPassword={!!u.passwordHash} /></div></section>
      <section className="card mt-4 p-6" aria-labelledby="p-s"><h2 id="p-s" className="text-[19px]">Devices</h2><p className="mt-1 text-[14px] text-mute">Lost a phone or used a shared computer? Sign out everywhere else.</p><div className="mt-4"><SessionsForm /></div></section>
      <p className="mt-6 text-[13.5px] text-mute">To download or delete your data, write to us from Support. We reply within 30 days, as the Digital Personal Data Protection Act requires.</p>
    </div>
  );
}
