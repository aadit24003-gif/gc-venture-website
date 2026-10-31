import type { Metadata } from 'next';
import Link from 'next/link';
import { CHECK_COUNT, POLICY, STUDENT } from '@/lib/config';
import { rupees } from '@/lib/format';
import Faq from '@/components/Faq';

export const metadata: Metadata = { title: 'Questions and answers', description: 'Refurbished laptops, grades, warranty, delivery, payments and the student discount, answered.' };

const GROUPS: { title: string; items: [string, string][] }[] = [
  { title: 'The laptops', items: [
    ['Where do your laptops come from?', 'Mostly from companies replacing their fleets every three to four years, and from our own rental business. Every one is checked for theft records and locks before we take it.'],
    ['Is refurbished the same as second-hand?', `No. Every laptop is tested on ${CHECK_COUNT} points, repaired with matching parts where needed, cleaned, wiped and reinstalled, then graded and covered by a ${POLICY.warrantyMonths}-month warranty.`],
    ['What do the grades mean?', 'Pristine looks close to new, Excellent has light marks you see up close, Good has visible wear and costs less. All grades work exactly the same.'],
    ['Will I get the exact laptop in the picture?', 'The picture is an illustration of the model. Ask on WhatsApp and we send photos of the unit before it ships.'],
    ['Can I add memory or storage?', 'Yes, on models with free slots; choose it on the product page and we fit and test it before dispatch.'],
  ] },
  { title: 'Orders and delivery', items: [
    ['How long does delivery take?', 'Two to four working days to most cities, up to a week elsewhere, after one to two days to re-test and pack. Delivery is free and insured.'],
    ['How do I track my order?', 'Sign in and open Your account, or use the link in your confirmation email. You also get the courier’s tracking number when it ships.'],
    ['Can I cancel?', 'Yes, any time before it ships, for a full refund.'],
  ] },
  { title: 'Payments', items: [
    ['How can I pay?', `UPI, debit and credit cards, net banking and wallets through Razorpay; card EMI from 3 to 12 months; or pay on delivery for orders up to ${rupees(POLICY.cod.maxOrder)}.`],
    ['Do I get a GST invoice?', 'Yes. Add your GSTIN at checkout for a business invoice. The invoice is in your account once the order is paid.'],
  ] },
  { title: 'Students', items: [
    ['How does the student discount work?', `Verify once with your college email or student ID and ${STUDENT.percent}% comes off at checkout for ${STUDENT.validityMonths} months.`],
    ['How long does ID verification take?', 'College emails ending in .ac.in, .edu.in or .edu are instant. ID photos are checked within one working day.'],
  ] },
  { title: 'Warranty and returns', items: [
    ['What if it develops a fault?', `Contact us within ${POLICY.warrantyMonths} months of delivery. We collect it, repair or replace it, and send it back free.`],
    ['Can I return it if I change my mind?', `Yes, within ${POLICY.returnDays} days of delivery, for a full refund. We arrange the pickup.`],
  ] },
];

export default function FaqPage() {
  return (
    <div className="wrap pb-10 pt-10 md:pt-16">
      <h1 className="text-[44px] md:text-[64px]">Questions and answers</h1>
      <p className="mt-4 max-w-[60ch] text-[18px] text-ink/80">Can’t find yours? <Link href="/contact" className="link">Ask us</Link>; a person replies.</p>
      <div className="mt-12 space-y-12">
        {GROUPS.map((g, i) => (
          <section key={g.title} className="grid gap-6 lg:grid-cols-[0.6fr_1.4fr]" aria-labelledby={`g${i}`}>
            <h2 id={`g${i}`} className="text-[28px]">{g.title}</h2>
            <Faq items={g.items} schema={false} />
          </section>
        ))}
      </div>
    </div>
  );
}
