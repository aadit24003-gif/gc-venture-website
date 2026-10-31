import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, FileText, Layers, Truck } from 'lucide-react';
import { CHECK_COUNT, LEGAL, POLICY } from '@/lib/config';
import ContactForm from '../contact/ContactForm';

export const metadata: Metadata = { title: 'Business and bulk orders', description: 'Refurbished business laptops for teams: GST invoices, matched configurations, warranty, and help choosing.' };

export default function Business() {
  return (
    <div className="wrap pb-10 pt-10 md:pt-14">
      <p className="eyebrow">For teams</p>
      <h1 className="mt-3 max-w-[18ch] text-[40px] leading-[1.02] md:text-[60px]">Laptops for your team, at a fraction of new.</h1>
      <p className="mt-5 max-w-[60ch] text-[18px] text-ink-2">ThinkPads, Latitudes and EliteBooks built for offices: inspected on {CHECK_COUNT} points, matched configurations, a GST invoice and a {POLICY.warrantyMonths}-month warranty on every unit.</p>
      <ul className="mt-10 grid gap-4 md:grid-cols-4">
        {[[FileText, 'GST invoice', 'Add your GSTIN at checkout to claim input tax credit (regular scheme).'], [Layers, 'Matched units', 'Same model, grade and configuration across the batch, when stock allows.'], [Truck, 'One delivery', 'Shipped together, insured, with a packing list of serial numbers.'], [Building2, 'Rent instead?', `For short projects, rent from our sister company ${LEGAL.rentals.name}.`]].map(([I, t, d]) => {
          const Icon = I as typeof FileText;
          return <li key={t as string} className="rounded-card border border-line bg-white p-5"><Icon size={22} aria-hidden="true" /><p className="mt-3 font-semibold">{t as string}</p><p className="mt-1 text-[14.5px] text-mute">{d as string}</p></li>;
        })}
      </ul>
      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 className="text-[28px]">Tell us what you need</h2>
          <p className="mt-3 text-mute">How many laptops, for what kind of work, by when and your budget. We reply within one working day with options and a quote. Under ten laptops? You can also <Link href="/laptops" className="link">order directly</Link>.</p>
        </div>
        <section className="rounded-sheet border border-line bg-white p-6 md:p-10" aria-label="Business enquiry"><ContactForm /></section>
      </div>
    </div>
  );
}
