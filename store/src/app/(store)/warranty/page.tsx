import type { Metadata } from 'next';
import { CONTACT, POLICY, whatsappLink } from '@/lib/config';
import { formatPhone, rupees } from '@/lib/format';
import InfoPage, { POLICY_LINKS } from '@/components/InfoPage';

export const metadata: Metadata = { title: 'Warranty', description: `Every refurbished laptop is covered for ${POLICY.warrantyMonths} months. What is covered and how to claim.` };

export default function Warranty() {
  const ext = POLICY.warrantyExtensions.find((w) => w.price > 0);
  return (
    <InfoPage
      title={`${POLICY.warrantyMonths}-month warranty on every laptop`}
      intro="If something stops working because of a fault, we fix it, swap it, or refund you. Here is exactly what that means."
      updated="31 October 2026"
      related={POLICY_LINKS.filter((l) => l.href !== '/warranty')}
      aside={
        <div className="rounded-[24px] bg-spruce p-6 text-white/85">
          <p className="display text-[20px] font-semibold text-white">Make a claim</p>
          <p className="mt-2 text-[15px]">Message us with your order number and a short video of the problem.</p>
          <a href={whatsappLink('Hi, I want to make a warranty claim. My order number is ')} className="btn btn-tag btn-sm mt-4" target="_blank" rel="noopener">WhatsApp us</a>
          <p className="mt-4 text-[14px]">Or call {formatPhone(CONTACT.phone)}, {CONTACT.hours}.</p>
        </div>
      }
    >
      <h2>How long it lasts</h2>
      <p>The warranty starts on the day the laptop is delivered and lasts {POLICY.warrantyMonths} months{ext ? `, or ${ext.months} months if you added the extension (${rupees(ext.price)}) at checkout` : ''}. It stays with the laptop if you sell or gift it.</p>
      <h2>What is covered</h2>
      <ul>
        <li>Any hardware fault under normal use: motherboard, memory, storage, screen, keyboard, touchpad, ports, speakers, camera, Wi-Fi and the charger we supplied.</li>
        <li>The battery, if it stops charging or its health drops below 50% during the warranty.</li>
        <li>Software problems we caused, such as an operating system that won’t activate.</li>
      </ul>
      <h2>What is not covered</h2>
      <ul>
        <li>Drops, cracks, dents and liquid damage after delivery.</li>
        <li>Repairs or upgrades by anyone else, or a broken warranty seal.</li>
        <li>Normal battery ageing above 50% health, and cosmetic wear after delivery.</li>
        <li>Software you installed, viruses, forgotten passwords and lost data. Keep backups.</li>
      </ul>
      <h2>How a claim works</h2>
      <ol className="list-decimal space-y-2 pl-5">
        <li>Contact us with your order number and a description or short video of the fault.</li>
        <li>We try to solve it remotely first. If it needs a repair, we arrange a free pickup.</li>
        <li>We repair it, usually within 5 working days of receiving it, and send it back free. If we can’t repair it, we replace it with the same or a better model, or refund what you paid.</li>
      </ol>
      <h2>Your rights</h2>
      <p>This warranty is in addition to your rights under the Consumer Protection Act, 2019. It does not limit them.</p>
    </InfoPage>
  );
}
