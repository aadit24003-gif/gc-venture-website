import type { Metadata } from 'next';
import Link from 'next/link';
import { getViewer } from '@/lib/auth/session';
import { studentStatus } from '@/lib/students';
import { cardProducts } from '@/lib/products';
import { POLICY, STUDENT } from '@/lib/config';
import { rupees } from '@/lib/format';
import { savedPct, studentUnitDiscount } from '@/lib/pricing';
import StudentCard from '@/components/students/StudentCard';
import VerifyStudent from '@/components/students/VerifyStudent';
import LaptopArt from '@/components/LaptopArt';

export const metadata: Metadata = {
  title: `Student discount: ${STUDENT.percent}% off refurbished laptops`,
  description: `Students get ${STUDENT.percent}% off every refurbished laptop. Verify once with your college email or student ID; the discount applies for ${STUDENT.validityMonths} months.`,
};
export const dynamic = 'force-dynamic';

const FAQ = [
  ['Who can get the student discount?', 'Anyone enrolled at a recognised school, college or university in India, full-time or part-time, including distance learning, as long as your ID or college email is current.'],
  ['How long does it last?', `${STUDENT.validityMonths} months from approval. After that, verify again with a current ID.`],
  ['Is there a limit?', `The discount applies to ${STUDENT.maxUnitsPerOrder === 1 ? 'one laptop' : `${STUDENT.maxUnitsPerOrder} laptops`} per order, on any model and grade.${STUDENT.maxDiscountPerUnit ? ` The most it takes off one laptop is ${rupees(STUDENT.maxDiscountPerUnit)}.` : ''}`],
  ['Can I use it with a coupon?', 'Not both at once. At checkout we apply whichever saves you more.'],
  ['What happens to my ID photo?', `It is stored privately, seen only by the person checking it, and deleted ${STUDENT.idRetentionDays} days after we decide. It is never shared.`],
  ['My college email doesn’t end in .ac.in or .edu. Can I still use it?', 'Yes. Confirm the code we send, and a person approves it within one working day. Or upload your ID instead.'],
];

export default async function StudentsPage() {
  const viewer = await getViewer();
  const [s, items] = await Promise.all([
    viewer ? studentStatus(viewer.user.id) : Promise.resolve(null),
    cardProducts(),
  ]);
  const initial = viewer && s
    ? { signedIn: true as const, state: s.state, until: s.row?.approvedUntil?.toISOString() ?? null, reason: s.row?.rejectReason ?? null }
    : { signedIn: false as const };
  const maxSaved = Math.max(0, ...items.map((p) => savedPct(p.fromPrice, p.newPrice) ?? 0));
  const picks = items.filter((p) => p.inStock && p.uses.includes('study')).sort((a, b) => a.fromPrice - b.fromPrice).slice(0, 6);

  return (
    <div className="pb-10">
      <section className="wrap grid items-center gap-14 pb-16 pt-10 md:pt-16 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <h1 className="max-w-[13ch] text-[46px] leading-[1.02] md:text-[72px]">Students pay {STUDENT.percent}% less on every laptop.</h1>
          <p className="mt-5 max-w-[52ch] text-[18px] text-mute">
            Verify once with your college email or a photo of your student ID. The discount is applied at checkout for the next {STUDENT.validityMonths} months{maxSaved ? `, on top of prices up to ${maxSaved}% below new` : ''}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#verify" className="btn btn-primary btn-lg">Verify in 2 minutes</a>
            <Link href="/laptops?use=study" className="btn btn-ghost btn-lg">See laptops for study</Link>
          </div>
        </div>
        <div className="pt-10 lg:pt-0"><StudentCard /></div>
      </section>

      <section className="wrap" aria-labelledby="how-h">
        <h2 id="how-h" className="sr-only">How it works</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ['Sign in', 'With your mobile number or email. No password.'],
            ['Verify', 'College email: approved instantly. Student ID photo: checked within one working day.'],
            [`Save ${STUDENT.percent}%`, `Applied automatically at checkout for ${STUDENT.validityMonths} months, with the ${POLICY.warrantyMonths}-month warranty as usual.`],
          ].map(([t, b], i) => (
            <li key={t} className="rounded-[26px] bg-white p-6">
              <span className="display flex h-10 w-10 items-center justify-center rounded-full bg-tag text-[18px] font-bold text-spruce">{i + 1}</span>
              <p className="mt-4 text-[20px] font-semibold text-spruce display">{t}</p>
              <p className="mt-1 text-[15.5px] text-mute">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="verify" className="wrap mt-14 scroll-mt-28" aria-labelledby="verify-h">
        <div className="sheet grid gap-10 p-6 md:p-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 id="verify-h" className="text-[34px] md:text-[42px]">Get verified</h2>
            <p className="mt-3 text-mute">Choose the route that suits you. Either way you only do it once a year.</p>
          </div>
          <VerifyStudent initial={initial} />
        </div>
      </section>

      {picks.length > 0 && (
        <section className="wrap mt-20" aria-labelledby="picks-h">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="picks-h" className="text-[34px]">Popular with students</h2>
            <Link href="/laptops?use=study" className="link">All laptops for study</Link>
          </div>
          <ul className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {picks.map((p) => (
              <li key={p.id}>
                <Link href={`/laptops/${p.slug}`} className="flex items-center gap-4 rounded-[24px] bg-white p-4 transition-shadow hover:shadow-[0_20px_40px_-26px_rgba(15,61,51,.5)]">
                  <span className="w-[110px] shrink-0 rounded-2xl bg-bench p-2"><LaptopArt art={p.art} brand={p.brand} slug={p.slug} flat /></span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-spruce">{p.title}</span>
                    <span className="block text-[13.5px] text-mute">{p.cpuShort}, {p.ramGb} GB</span>
                    <span className="mt-1.5 flex items-baseline gap-2">
                      <span className="price text-[21px]">{rupees(p.fromPrice - studentUnitDiscount(p.fromPrice))}</span>
                      <span className="text-[13.5px] text-mute line-through">{rupees(p.fromPrice)}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="hint mt-3">Student prices shown for the lowest-priced grade in stock.</p>
        </section>
      )}

      <section className="wrap mt-20 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]" aria-labelledby="sfaq-h">
        <h2 id="sfaq-h" className="text-[34px]">Questions students ask</h2>
        <div className="divide-y divide-line rounded-[28px] bg-white px-6">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold text-spruce">
                {q}<span className="text-[22px] leading-none transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-3 max-w-[65ch] text-[15.5px] leading-relaxed text-ink">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
