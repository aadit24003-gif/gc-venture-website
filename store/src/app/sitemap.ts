import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/config';
import { cardProducts } from '@/lib/products';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await cardProducts();
  const pages = ['', '/laptops', '/students', '/how-we-test', '/warranty', '/returns', '/shipping', '/faq', '/about', '/contact', '/terms', '/privacy'];
  return [
    ...pages.map((p) => ({ url: `${BRAND.url}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.6 })),
    ...items.map((p) => ({ url: `${BRAND.url}/laptops/${p.slug}`, changeFrequency: 'daily' as const, priority: 0.8 })),
  ];
}
