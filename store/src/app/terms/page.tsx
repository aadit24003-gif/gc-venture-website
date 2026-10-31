import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND, CONTACT, LEGAL, POLICY, STUDENT } from '@/lib/config';
import InfoPage, { POLICY_LINKS } from '@/components/InfoPage';

export const metadata: Metadata = { title: 'Terms of sale' };

export default function Terms() {
  return (
    <InfoPage
      title="Terms of sale"
      intro={`These terms apply when you buy from ${BRAND.name}. They are written to be read; if anything is unclear, ask us.`}
      updated="31 October 2026"
      related={POLICY_LINKS.filter((l) => l.href !== '/terms')}
    >
      <h2>Who we are</h2>
      <p>{BRAND.name} is run by {LEGAL.entity}{LEGAL.gstin ? ` (GSTIN ${LEGAL.gstin})` : ''}, {LEGAL.addresses[0].lines.join(', ')}. Contact us at {CONTACT.email}.</p>
      <h2>What we sell</h2>
      <p>Refurbished laptops: previously used, then inspected, repaired where needed, tested, cleaned, wiped and graded by us. Product illustrations show the model, not the individual unit; the condition grade and its description tell you how the unit you receive looks. Brand names belong to their owners; we are not an authorised reseller of, or affiliated with, any manufacturer, and manufacturer warranties do not apply. Our own warranty does.</p>
      <h2>Prices and payment</h2>
      <ul>
        <li>Prices are in Indian rupees and include GST. Delivery is free.</li>
        <li>Online payments are processed by Razorpay; we never see or store your card details. Card EMI interest is set by your bank.</li>
        <li>If a price is clearly wrong because of an error, we will tell you before dispatch and you may cancel for a full refund.</li>
      </ul>
      <h2>Orders</h2>
      <p>Your order is confirmed when payment succeeds, or when you choose pay on delivery and we email the confirmation. Online orders that aren’t paid within 30 minutes are cancelled automatically. We may cancel an order if the laptop fails its final check before dispatch, if we suspect fraud or resale in bulk, or if we can’t deliver to the address; you are refunded in full.</p>
      <h2>Student discount</h2>
      <p>The {STUDENT.percent}% student discount is for individuals currently enrolled at a recognised school, college or university, verified with a college email or student ID. It lasts {STUDENT.validityMonths} months, applies to {STUDENT.maxUnitsPerOrder === 1 ? 'one laptop' : `${STUDENT.maxUnitsPerOrder} laptops`} per order and does not combine with coupons. We may withdraw it and cancel orders if verification details turn out to be false.</p>
      <h2>Delivery, returns and warranty</h2>
      <p>See <Link href="/shipping">Shipping</Link>, <Link href="/returns">Returns and refunds</Link> and <Link href="/warranty">Warranty</Link>. They form part of these terms.</p>
      <h2>Liability</h2>
      <p>We are responsible for losses that are a foreseeable result of us breaking these terms. We are not responsible for data on a device you send to us; please back it up. Nothing here limits your rights under the Consumer Protection Act, 2019 or the Consumer Protection (E-Commerce) Rules, 2020.</p>
      <h2>Grievances</h2>
      <p>Write to our grievance officer{LEGAL.grievanceOfficer.name ? `, ${LEGAL.grievanceOfficer.name},` : ''} at {LEGAL.grievanceOfficer.email}. We acknowledge complaints within 48 hours and resolve them within one month.</p>
      <h2>Law</h2>
      <p>These terms are governed by the laws of India. Courts at Gurugram, Haryana have jurisdiction, without affecting your right to approach a consumer commission where you live.</p>
    </InfoPage>
  );
}
