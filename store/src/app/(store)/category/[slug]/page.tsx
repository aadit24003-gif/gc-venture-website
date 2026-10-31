import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import ListingPage from '@/components/catalogue/ListingPage';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function find(slug: string) {
  const d = await db();
  const [c] = await d.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return c?.active ? c : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await find((await params).slug);
  return c ? { title: `${c.name}: refurbished`, description: c.description, alternates: { canonical: `/category/${c.slug}` } } : {};
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const c = await find((await params).slug);
  if (!c) notFound();
  return (
    <ListingPage
      sp={await searchParams} path={`/category/${c.slug}`}
      title={c.name} intro={c.description}
      crumbs={[{ href: '/laptops', label: 'Laptops' }, { href: `/category/${c.slug}`, label: c.name }]}
      base={{ category: c.slug }}
    />
  );
}
