import type { Metadata } from 'next';
import { desc, eq } from 'drizzle-orm';
import { getViewer } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { addresses } from '@/lib/db/schema';
import { studentStatus } from '@/lib/students';
import { isDemo } from '@/lib/config';
import { razorpayConfigured } from '@/lib/providers/razorpay';
import CheckoutClient from '@/components/checkout/CheckoutClient';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const viewer = await getViewer();
  let saved: (typeof addresses.$inferSelect)[] = [];
  let student: 'approved' | 'pending' | 'rejected' | 'none' = 'none';
  if (viewer) {
    const d = await db();
    [saved, student] = await Promise.all([
      d.select().from(addresses).where(eq(addresses.userId, viewer.user.id)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt)),
      studentStatus(viewer.user.id).then((s) => s.state),
    ]);
  }
  return (
    <div className="wrap pb-10 pt-8 md:pt-12">
      <h1 className="text-[36px] md:text-[48px]">Checkout</h1>
      <CheckoutClient
        viewer={viewer ? { name: viewer.user.name, phone: viewer.user.phone, email: viewer.user.email } : null}
        addresses={saved.map((a) => ({ id: a.id, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode }))}
        student={student}
        onlineReady={razorpayConfigured() || isDemo()}
      />
    </div>
  );
}
