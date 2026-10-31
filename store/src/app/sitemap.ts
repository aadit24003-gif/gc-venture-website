import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/config';
import { cardProducts } from '@/lib/products';
import { db } from '@/lib/db';
import { brands, categories } from '@/lib/db/schema';
import { publishedPosts } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const d = await db();
  const [items, bs, cs, posts] = await Promise.all([cardProducts(), d.select().from(brands), d.select().from(categories), publishedPosts(500)]);
  const pages = ['', '/laptops', '/deals', '/students', '/business', '/how-we-test', '/warranty', '/returns', '/shipping', '/faq', '/about', '/contact', '/support', '/terms', '/privacy', '/grievance', '/blog'];
  return [
    ...pages.map((p) => ({ url: `${BRAND.url}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.6 })),
    ...bs.filter((b) => b.active).map((b) => ({ url: `${BRAND.url}/brands/${b.slug}`, changeFrequency: 'daily' as const, priority: 0.7 })),
    ...cs.filter((c) => c.active).map((c) => ({ url: `${BRAND.url}/category/${c.slug}`, changeFrequency: 'daily' as const, priority: 0.7 })),
    ...items.map((p) => ({ url: `${BRAND.url}/laptops/${p.slug}`, changeFrequency: 'daily' as const, priority: p.inStock ? 0.8 : 0.4, images: p.image ? [`${BRAND.url}${p.image.src}`] : undefined })),
    ...posts.map((p) => ({ url: `${BRAND.url}/blog/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'monthly' as const, priority: 0.5 })),
  ];
}
