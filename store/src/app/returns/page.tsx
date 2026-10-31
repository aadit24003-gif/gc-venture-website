import type { Metadata } from 'next';
import { CONTACT, POLICY, whatsappLink } from '@/lib/config';
import InfoPage, { POLICY_LINKS } from '@/components/InfoPage';

export const metadata: Metadata = { title: 'Returns, refunds and cancellations', description: `Return any laptop within ${POLICY.returnDays} days of delivery for a full refund. Cancellations and refund timelines.` };

export default function Returns() {
  return (
    <InfoPage
      title="Returns, refunds and cancellations"
      intro={`Changed your mind, or it isn’t what you expected? Send it back within ${POLICY.returnDays} days of delivery and we refund the full amount.`}
      updated="31 October 2026"
      related={POLICY_LINKS.filter((l) => l.href !== '/returns')}
      aside={
        <div className="rounded-[24px] bg-white p-6">
          <p className="display text-[20px] font-semibold text-spruce">Start a return</p>
          <p className="mt-2 text-[15px] text-mute">Message us your order number. We reply within one working day with a pickup date.</p>
          <a href={whatsappLink('Hi, I want to return my order. Order number: ')} className="btn btn-primary btn-sm mt-4" target="_blank" rel="noopener">WhatsApp us</a>
          <p className="mt-3 text-[14px] text-mute">Or email {CONTACT.email}</p>
        </div>
      }
    >
      <h2>Cancelling an order</h2>
      <p>You can cancel any order until it ships, from WhatsApp, phone or email. Paid orders are refunded in full to the original payment method. Once it has shipped, refuse the delivery or return it as below.</p>
      <h2>Returning a laptop</h2>
      <ul>
        <li>Tell us within {POLICY.returnDays} days of delivery. You don’t have to give a reason.</li>
        <li>Pack it with its charger, preferably in the original box. Sign out of your accounts and remove any password.</li>
        <li>We collect it free of charge from the delivery address.</li>
        <li>Returns are checked against the condition report it was sold with. If it comes back damaged, or with parts missing or changed, we may deduct the cost of putting that right and tell you before we do.</li>
      </ul>
      <h2>Arrived faulty or not as described?</h2>
      <p>Tell us within 48 hours of delivery with photos or a short video. We collect it and send a replacement, or refund you if you prefer. If the box was visibly damaged in transit, a video of you opening it helps us claim from the courier.</p>
      <h2>When the money reaches you</h2>
      <ul>
        <li>We start the refund within 2 working days of receiving the laptop back.</li>
        <li>UPI, cards, net banking and wallets: back to the same account, usually in 5 to 7 working days, depending on your bank.</li>
        <li>Pay on delivery orders: by bank transfer or UPI to an account you give us.</li>
        <li>Student discounts and coupons are not refunded as cash; you get back what you actually paid.</li>
      </ul>
    </InfoPage>
  );
}
