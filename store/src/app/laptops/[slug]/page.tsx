import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';
import { getProduct, similarTo, toCard } from '@/lib/products';
import { getViewer } from '@/lib/auth/session';
import { studentStatus } from '@/lib/students';
import { BRAND, CHECK_COUNT, POLICY } from '@/lib/config';
import { gb, rupees } from '@/lib/format';
import ProductView from '@/components/product/ProductView';
import ProductCard from '@/components/ProductCard';
import { USES } from '@/lib/filters';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: 'Laptop not found' };
  const c = toCard(p);
  return {
    title: `Refurbished ${p.title} (${p.cpuShort}, ${gb(p.ramGb)}, ${gb(p.ssdGb)})`,
    description: `${p.title}, certified refurbished, from ${rupees(c.fromPrice)}. ${p.description} ${POLICY.warrantyMonths}-month warranty, free delivery.`,
    alternates: { canonical: `/laptops/${p.slug}` },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, sp, viewer] = await Promise.all([params, searchParams, getViewer()]);
  const p = await getProduct(slug);
  if (!p) notFound();
  const [similar, student] = await Promise.all([
    similarTo(p),
    viewer ? studentStatus(viewer.user.id) : Promise.resolve({ state: 'none' as const }),
  ]);
  const card = toCard(p);

  const specs: [string, string][] = [
    ['Processor', p.cpu],
    ['Graphics', p.gpu],
    ['Memory', p.ramOptions.length > 1 ? `${gb(p.ramGb)} as listed, up to ${gb(Math.max(...p.ramOptions.map((o) => o.gb)))}` : `${gb(p.ramGb)}, built in`],
    ['Storage', `${gb(p.ssdGb)} SSD${p.ssdOptions.length > 1 ? `, up to ${gb(Math.max(...p.ssdOptions.map((o) => o.gb)))}` : ''}`],
    ['Display', `${p.screenIn}″ ${p.screenRes}${p.touch ? ', touch' : ''}`],
    ['Weight', p.weightKg ? `${p.weightKg} kg` : '—'],
    ['Ports', p.ports.join(', ')],
    ['Operating system', p.os === 'macOS' ? 'macOS, latest version the model supports' : 'Windows 11 Pro, activated'],
    ['Model year', p.year ? String(p.year) : '—'],
    ['In the box', p.brand === 'Apple' ? 'Laptop and a compatible USB-C charger' : 'Laptop and a matching charger'],
  ];

  const summary = `${p.cpuShort}, ${p.screenIn}″ ${p.screenRes.split(' ')[0] === 'Full' ? 'Full HD' : p.screenRes.split(' ').slice(0, -1).join(' ')}, ${p.weightKg} kg`;
  const goodFor = USES.filter((u) => p.uses.includes(u.key));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${p.title} (Refurbished)`,
    brand: { '@type': 'Brand', name: p.brand },
    description: p.description,
    sku: p.slug,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: Math.min(...p.variants.map((v) => v.price)) / 100,
      highPrice: Math.max(...p.variants.map((v) => v.price)) / 100,
      offerCount: p.variants.length,
      availability: card.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/RefurbishedCondition',
      seller: { '@type': 'Organization', name: BRAND.name },
    },
  };

  return (
    <div className="wrap pb-10 pt-6 md:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-[14px] text-mute">
        <ol className="flex flex-wrap gap-1.5">
          <li><Link href="/laptops" className="hover:text-spruce">Laptops</Link> /</li>
          <li><Link href={`/laptops?brand=${p.brand}`} className="hover:text-spruce">{p.brand}</Link> /</li>
          <li aria-current="page" className="text-ink">{p.model}</li>
        </ol>
      </nav>

      <ProductView
        p={{
          id: p.id, slug: p.slug, title: p.title, brand: p.brand, model: p.model, year: p.year, summary,
          art: p.art, newPrice: p.newPrice, images: p.images, ramOptions: p.ramOptions, ssdOptions: p.ssdOptions,
          variants: p.variants.map((v) => ({ grade: v.grade, price: v.price, stock: v.stock, active: v.active })),
        }}
        student={student.state === 'approved' ? 'approved' : student.state === 'pending' ? 'pending' : 'none'}
        initial={{ grade: sp.grade, ram: sp.ram ? Number(sp.ram) : undefined, ssd: sp.ssd ? Number(sp.ssd) : undefined }}
      />

      <section className="mt-20 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" aria-labelledby="about-h">
        <div>
          <h2 id="about-h" className="text-[32px]">About this laptop</h2>
          <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed">{p.description}</p>
          <ul className="mt-6 space-y-2.5">
            {p.highlights.map((h) => (
              <li key={h} className="flex items-center gap-3 text-[16px]"><Check size={18} className="text-pass" strokeWidth={2.5} />{h}</li>
            ))}
          </ul>
          {goodFor.length > 0 && (
            <div className="mt-8">
              <h3 className="text-[18px]">Good for</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {goodFor.map((u) => (
                  <li key={u.key}><Link href={`/laptops?use=${u.key}`} className="chip">{u.label}</Link></li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-10 rounded-[24px] bg-spruce p-6 text-white/85">
            <h3 className="text-[20px] text-white">Tested on {CHECK_COUNT} points before it ships</h3>
            <p className="mt-2 text-[15px] leading-relaxed">Screen, battery, every key, ports, wireless, camera and speakers are checked, the data is wiped to NIST 800-88 and Windows or macOS is reinstalled fresh.</p>
            <Link href="/how-we-test" className="mt-4 inline-block font-semibold text-tag underline underline-offset-4">See every check</Link>
          </div>
        </div>
        <div>
          <h2 className="text-[32px]">Specifications</h2>
          <dl className="mt-4 overflow-hidden rounded-[24px] bg-white">
            {specs.map(([k, v], i) => (
              <div key={k} className={`grid grid-cols-[150px_1fr] gap-4 px-5 py-3.5 text-[15px] md:grid-cols-[190px_1fr] ${i ? 'border-t border-line' : ''}`}>
                <dt className="text-mute">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {similar.length > 0 && (
        <section className="mt-20" aria-labelledby="similar-h">
          <div className="flex items-end justify-between gap-4">
            <h2 id="similar-h" className="text-[32px]">You might also like</h2>
            <Link href="/laptops" className="link text-[15px]">All laptops</Link>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((s) => <li key={s.id}><ProductCard p={s} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
