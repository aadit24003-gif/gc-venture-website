import type { Metadata } from 'next';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { LEGAL } from '@/lib/config';
import { getSettings } from '@/lib/settings';
import { formatPhone } from '@/lib/format';
import ContactForm from './ContactForm';

export const metadata: Metadata = { title: 'Contact us', description: 'Talk to a person about choosing a laptop, an order, a warranty claim or a bulk purchase.' };

export default async function Contact() {
  const { business: b } = await getSettings();
  return (
    <div className="wrap pb-10 pt-10 md:pt-16">
      <h1 className="max-w-[14ch] text-[44px] leading-[1.02] md:text-[64px]">Talk to a person</h1>
      <p className="mt-5 max-w-[60ch] text-[18px] text-ink-2">Not sure which laptop fits? Tell us what you’ll use it for and your budget, and we’ll suggest two or three. {b.hours}.</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-3">
          {[
            { icon: MessageCircle, label: 'WhatsApp', value: formatPhone(b.whatsapp), href: `https://wa.me/${b.whatsapp}`, note: 'Fastest. Photos and videos welcome.' },
            { icon: Phone, label: 'Call', value: formatPhone(b.phone), href: `tel:${b.phone}`, note: b.hours },
            { icon: Mail, label: 'Email', value: b.email, href: `mailto:${b.email}`, note: 'We reply within one working day.' },
          ].map(({ icon: I, label, value, href, note }) => (
            <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener" className="flex items-center gap-4 rounded-card border border-line bg-white p-5 transition hover:border-ink">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink"><I size={22} /></span>
              <span><span className="block text-[14px] text-mute">{label}</span><span className="block text-[18px] font-semibold text-ink">{value}</span><span className="block text-[13.5px] text-mute">{note}</span></span>
            </a>
          ))}
          <div className="rounded-card border border-line bg-white p-5">
            <p className="text-[14px] text-mute">Offices (by appointment)</p>
            {LEGAL.addresses.map((a) => (
              <p key={a.city} className="mt-2 text-[15px]"><b>{a.city}</b><br />{a.lines.join(', ')}</p>
            ))}
          </div>
        </div>
        <section className="rounded-sheet border border-line bg-white p-6 md:p-10" aria-labelledby="form-h">
          <h2 id="form-h" className="text-[28px]">Send a message</h2>
          <div className="mt-6"><ContactForm /></div>
        </section>
      </div>
    </div>
  );
}
