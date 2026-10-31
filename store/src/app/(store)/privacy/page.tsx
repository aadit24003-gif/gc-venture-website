import type { Metadata } from 'next';
import { BRAND, LEGAL, STUDENT } from '@/lib/config';
import InfoPage, { POLICY_LINKS } from '@/components/InfoPage';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function Privacy() {
  return (
    <InfoPage
      title="Privacy"
      intro={`What ${BRAND.name} collects, why, who it is shared with, and how to have it deleted. We collect the least we need to sell and support your laptop.`}
      updated="31 October 2026"
      related={POLICY_LINKS.filter((l) => l.href !== '/privacy')}
    >
      <h2>What we collect</h2>
      <ul>
        <li><b>Account:</b> your mobile number or email address, and your name.</li>
        <li><b>Orders:</b> delivery address, phone, items, payment status and, if you give it, your GSTIN. Card and UPI details go to Razorpay, not to us.</li>
        <li><b>Student verification:</b> your name, college, course, graduation year, and either your college email address or a photo of your student ID.</li>
        <li><b>Technical:</b> a session cookie that keeps you signed in, your cart saved in your own browser, and server logs (IP address, browser) kept for security.</li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To sign you in, process and deliver orders, provide warranty service, and send order emails and messages.</li>
        <li>To verify student status. ID photos are seen only by the staff member checking them.</li>
        <li>To prevent fraud and to meet tax and accounting law.</li>
      </ul>
      <p>We don’t sell your data, and we don’t send marketing without your consent.</p>
      <h2>Who we share it with</h2>
      <ul>
        <li>Razorpay, to take payments; the courier, to deliver; SMS and email providers, to send codes and updates; our hosting and database providers, to run the store. Each uses it only for that purpose.</li>
        <li>Authorities, when the law requires it.</li>
      </ul>
      <h2>How long we keep it</h2>
      <ul>
        <li>Student ID photos: deleted {STUDENT.idRetentionDays} days after we approve or reject them.</li>
        <li>Login codes: unusable after 10 minutes and stored only as a scrambled value.</li>
        <li>Orders and invoices: 8 years, as required by tax law.</li>
        <li>Your account: until you ask us to delete it.</li>
      </ul>
      <h2>Your rights</h2>
      <p>Under the Digital Personal Data Protection Act, 2023 you can ask to see, correct or delete your data, or withdraw consent. Write to {LEGAL.grievanceOfficer.email}; we reply within 30 days.</p>
      <h2>Who is responsible</h2>
      <p>{LEGAL.entity}, {LEGAL.addresses[0].lines.join(', ')}. Grievance officer{LEGAL.grievanceOfficer.name ? `: ${LEGAL.grievanceOfficer.name}` : ''}, {LEGAL.grievanceOfficer.email}.</p>
    </InfoPage>
  );
}
