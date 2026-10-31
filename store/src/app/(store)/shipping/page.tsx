import type { Metadata } from 'next';
import { POLICY } from '@/lib/config';
import { rupees } from '@/lib/format';
import InfoPage, { POLICY_LINKS } from '@/components/InfoPage';

export const metadata: Metadata = { title: 'Shipping and delivery', description: 'Free, insured delivery across India. Dispatch times, delivery times by region and tracking.' };

export default function Shipping() {
  return (
    <InfoPage
      title="Shipping and delivery"
      intro="Delivery is free to every serviceable PIN code in India, insured until it reaches you, and tracked from our workshop to your door."
      updated="31 October 2026"
      related={POLICY_LINKS.filter((l) => l.href !== '/shipping')}
    >
      <h2>When it ships</h2>
      <p>Orders are re-tested, packed and handed to the courier within {POLICY.dispatchDays.min} to {POLICY.dispatchDays.max} working days of payment (or of confirmation, for pay on delivery). You get an email with the tracking number as soon as it leaves.</p>
      <h2>How long delivery takes</h2>
      <ul>
        <li>Delhi NCR, Mumbai, Pune, Bengaluru, Chennai, Hyderabad, Kolkata and Ahmedabad: 2 to 4 working days after dispatch.</li>
        <li>Most other cities and towns: 4 to 7 working days.</li>
        <li>The North-East, Jammu and Kashmir, Ladakh and the islands: 6 to 10 working days.</li>
      </ul>
      <p>Product pages show an estimate for your PIN code. Couriers occasionally run late around festivals and severe weather; we chase them for you.</p>
      <h2>Costs</h2>
      <p>Delivery is free. Pay on delivery is available for orders up to {rupees(POLICY.cod.maxOrder)}{POLICY.cod.fee ? ` for a ${rupees(POLICY.cod.fee)} handling fee` : ', at no extra cost'}.</p>
      <h2>Receiving your laptop</h2>
      <ul>
        <li>Someone at the address may need to show the one-time code the courier sends, for high-value parcels.</li>
        <li>Check that the tamper tape is intact before accepting. If the box is damaged, you can refuse it.</li>
        <li>Record a short video while unboxing. It makes any transit claim quick.</li>
      </ul>
      <h2>If a delivery fails</h2>
      <p>The courier tries up to three times. If the parcel comes back to us, we contact you to arrange a new delivery or refund you in full.</p>
    </InfoPage>
  );
}
