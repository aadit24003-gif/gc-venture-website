import type { Metadata } from 'next';
import { desc, eq } from 'drizzle-orm';
import { requireViewer } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { addresses } from '@/lib/db/schema';
import AddressBook from './AddressBook';

export const metadata: Metadata = { title: 'Addresses', robots: { index: false } };

export default async function Addresses() {
  const v = await requireViewer('/account/addresses');
  const d = await db();
  const list = await d.select().from(addresses).where(eq(addresses.userId, v.user.id)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  return (
    <div>
      <h1 className="text-[32px]">Addresses</h1>
      <p className="mt-2 text-mute">Your default address is picked first at checkout.</p>
      <AddressBook list={list.map((a) => ({ id: a.id, label: a.label, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault }))} defaults={{ name: v.user.name ?? '', phone: v.user.phone ?? '' }} />
    </div>
  );
}
