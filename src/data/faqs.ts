import { CLAIMS } from '../config/site';
import type { FAQ } from './categories';

/** General FAQs used on the home page and the quote page. Answers adapt to enabled claims. */
export const GENERAL_FAQS: FAQ[] = [
  {
    q: 'What is the minimum rental period?',
    a: CLAIMS.noLockIn.enabled
      ? 'There is no lock-in or minimum commitment. Rent for a project, a quarter or several years, and return devices when you no longer need them.'
      : 'Minimum periods depend on the equipment. We confirm the term in your quote.',
  },
  {
    q: 'Do you charge a security deposit or advance?',
    a: [CLAIMS.zeroDeposit.enabled && 'There is no security deposit', CLAIMS.noAdvance.enabled && 'no advance payment']
      .filter(Boolean)
      .join(' and ')
      .replace(/^./, (c) => c.toUpperCase())
      .concat(CLAIMS.monthlyBilling.enabled ? '. Rentals are billed monthly for what you use.' : '.'),
  },
  {
    q: 'How quickly can you deliver?',
    a: CLAIMS.fastDelivery.enabled
      ? 'Same-day or next-day in the cities we serve, depending on quantity and configuration. Large deployments are scheduled to your go-live date.'
      : 'Delivery dates depend on quantity and configuration. We confirm a date in your quote.',
  },
  {
    q: 'What if a device fails during the rental?',
    a: `We replace it. Raise a request through our support page, by phone or on WhatsApp${CLAIMS.support247.enabled ? ', any time of day' : ''}.`,
  },
  {
    q: 'Can you handle hundreds of devices at once?',
    a: 'Yes. Bulk orders are planned with you: configuration, labelling, staggered delivery by site and a single point of contact. Larger deployments get tailored pricing.',
  },
  {
    q: 'How is our data handled when devices come back?',
    a: 'Every returned device is wiped before it is reconditioned or rented again.',
  },
];
