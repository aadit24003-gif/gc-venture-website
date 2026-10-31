import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings } from '@/lib/settings';
import { BRAND } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Grievance officer', description: 'How to raise a complaint, and who handles it.' };

export default async function Grievance() {
  const { business: b } = await getSettings();
  return (
    <div className="wrap-narrow pb-16 pt-10 md:pt-14">
      <p className="eyebrow">Consumer Protection (E-Commerce) Rules, 2020</p>
      <h1 className="mt-3 text-[38px] md:text-[52px]">Grievance officer</h1>
      <div className="prose-policy mt-8 rounded-[24px] border border-line bg-white p-6 md:p-10">
        <p>If something has gone wrong and our support team hasn’t resolved it, write to our grievance officer. We acknowledge every complaint within 48 hours and resolve it within one month.</p>
        <h2>Contact</h2>
        <ul>
          <li><strong>Name:</strong> {b.grievanceName ?? '[CONFIRM: name to be added]'}</li>
          <li><strong>Email:</strong> <a href={`mailto:${b.grievanceEmail}`}>{b.grievanceEmail}</a></li>
          <li><strong>Phone:</strong> {b.phone} ({b.hours})</li>
          <li><strong>Address:</strong> {b.legalName}, {b.registeredAddress}</li>
        </ul>
        <h2>What to include</h2>
        <p>Your order number, what happened, and what you’d like us to do. Photos help. If you have a support ticket or a return number, include it too.</p>
        <p>For everyday questions, the quickest route is <Link href="/support">Help and support</Link>. {BRAND.name} is operated by {b.legalName}.</p>
      </div>
    </div>
  );
}
