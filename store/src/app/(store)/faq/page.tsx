import type { Metadata } from 'next';
import Link from 'next/link';
import { CHECK_COUNT, POLICY, STUDENT } from '@/lib/config';
import { rupees } from '@/lib/format';
import Faq from '@/components/Faq';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Questions and answers', description: 'Refurbished laptops, grades, warranty, delivery, payments and the student discount, answered.' };

const groups = (booking: string | null, codMax: number): { title: string; items: [string, string][] }[] => [
  { title: 'The laptops', items: [
    ['Where do your laptops come from?', 'All our laptops are imported business-grade models: Lenovo ThinkPad, Dell Latitude, HP EliteBook and Apple MacBook. Every one is checked for theft records and locks before we list it.'],
    ['Is refurbished the same as second-hand?', `No. Every laptop is tested on ${CHECK_COUNT} points, repaired with matching parts where needed, cleaned, wiped and reinstalled, then graded and covered by a ${POLICY.warrantyMonths}-month warranty.`],
    ['What do the grades mean?', 'Pristine looks close to new, Excellent has light marks you see up close, Good has visible wear and costs less. All grades work exactly the same.'],
    ['Will I get the exact laptop I choose?', 'Yes. Every listing is a specific unit with its own ID, grade, measured battery and SSD health, cosmetic notes and inspection report. The photos at the top of a model’s page are the manufacturer’s. Before dispatch we show you your unit on a video call, and its serial number is on your order page so you can match it on delivery.'],
    ['Can I add memory or storage?', 'Yes, on models with free slots; choose it on the product page and we fit and test it before dispatch.'],
  ] },
  ...(booking ? [{ title: 'Booking and the video call', items: [
    [`How does booking for ${booking} work?`, `Choose “Book now” at checkout and pay ${booking} online. The laptop is taken off sale for you and the amount comes off its price. Before dispatch we video-call you and show this exact laptop, its condition and its serial number. You pay the balance on delivery, in cash or UPI, after matching the serial number.`],
    ['What happens on the video call?', 'We call you on WhatsApp video from our workshop, show the laptop from every side, switch it on, and show the serial number sticker. Ask us anything. You can also request the call yourself from your order page.'],
    ['What if I don’t like what I see?', `Cancel from your order page before we dispatch it and your ${booking} is refunded in full.`],
    ['How do I match the serial number?', 'Your order page shows the serial number of your exact laptop. When the courier hands it over, compare it with the sticker under the laptop. If it doesn’t match, don’t accept the delivery and call us.'],
  ] as [string, string][] }] : []),
  { title: 'Orders and delivery', items: [
    ['How long does delivery take?', 'Two to four working days to most cities, up to a week elsewhere, after one to two days to re-test and pack. Delivery is free and insured.'],
    ['How do I track my order?', 'Open it from your account, from the link in your confirmation email, or on the Track an order page with your order number and email or phone. It shows eight steps, from final inspection to delivery, and the courier’s tracking number once it ships.'],
    ['Can I buy without an account?', 'Yes. Check out as a guest with your email and phone; you can create an account later with the same email and your orders appear in it.'],
    ['Can I cancel?', 'Yes, from the order page, until we start packing; online payments are refunded automatically.'],
  ] },
  { title: 'Payments', items: [
    ['How can I pay?', `UPI, debit and credit cards, net banking and wallets through Razorpay; card EMI from 3 to 12 months; or pay on delivery for orders up to ${rupees(codMax)}.`],
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

export default async function FaqPage() {
  const s = await getSettings();
  const GROUPS = groups(s.shipping.bookingEnabled ? rupees(s.shipping.bookingAmount) : null, s.shipping.codMax);
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
