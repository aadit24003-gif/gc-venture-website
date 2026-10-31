import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cardProducts } from '@/lib/products';
import { parseFilters, type Filters } from '@/lib/filters';
import { getViewer } from '@/lib/auth/session';
import { wishlistIds } from '@/lib/shopping';
import { BRAND } from '@/lib/config';
import Catalogue from './Catalogue';

type SP = Record<string, string | string[] | undefined>;

/** Catalogue page shell: breadcrumb, heading, filters and results, with ItemList structured data. */
export default async function ListingPage({ sp, title, intro, crumbs, base = {}, path, defaults = {} }: {
  sp: SP; title: string; intro?: React.ReactNode; crumbs: { href: string; label: string }[]; base?: Partial<Filters>; path: string; defaults?: Partial<Filters>;
}) {
  const [items, viewer] = await Promise.all([cardProducts(), getViewer()]);
  const initial = { ...parseFilters(sp, base), ...(Object.keys(sp).length ? {} : defaults) };
  const wished = viewer ? await wishlistIds(viewer.user.id) : [];
  const inScope = items.filter((p) => (!base.brand?.length || base.brand.includes(p.brand)) && (!base.category || p.categories.includes(base.category)) && p.inStock);
  return (
    <div className="wrap pb-10 pt-6 md:pt-8">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-[13px] text-mute">
          <li><Link href="/" className="hover:text-ink">Home</Link></li>
          {crumbs.map((c) => <li key={c.href} className="flex items-center gap-1"><ChevronRight size={13} aria-hidden="true" /><Link href={c.href} className="hover:text-ink">{c.label}</Link></li>)}
        </ol>
      </nav>
      <header className="mt-5 max-w-[820px]">
        <h1 className="text-[38px] md:text-[54px]">{title}</h1>
        {intro && <div className="mt-3 text-[16.5px] text-mute">{intro}</div>}
      </header>
      <div className="mt-8"><Catalogue items={items} initial={initial} base={base} wished={wished} /></div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: BRAND.url }, ...crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 2, name: c.label, item: `${BRAND.url}${c.href}` }))] },
          { '@type': 'ItemList', name: title, url: `${BRAND.url}${path}`, itemListElement: inScope.slice(0, 30).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${BRAND.url}/laptops/${p.slug}`, name: p.title })) },
        ],
      }).replace(/</g, '\\u003c') }} />
    </div>
  );
}
