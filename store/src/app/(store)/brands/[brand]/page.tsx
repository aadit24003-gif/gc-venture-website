import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { brands } from '@/lib/db/schema';
import { POLICY } from '@/lib/config';
import ListingPage from '@/components/catalogue/ListingPage';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ brand: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function find(slug: string) {
  const d = await db();
  const [b] = await d.select().from(brands).where(eq(brands.slug, slug.toLowerCase())).limit(1);
  return b?.active ? b : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await find((await params).brand);
  if (!b) return {};
  const what = b.name === 'Apple' ? 'MacBooks' : `${b.name} laptops`;
  return { title: `Refurbished ${what}`, description: `${b.description} Inspected units with measured battery health and a ${POLICY.warrantyMonths}-month warranty.`, alternates: { canonical: `/brands/${b.slug}` } };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const b = await find((await params).brand);
  if (!b) notFound();
  return (
    <ListingPage
      sp={await searchParams} path={`/brands/${b.slug}`}
      title={b.name === 'Apple' ? 'Refurbished MacBooks' : `Refurbished ${b.name} laptops`}
      intro={b.description}
      crumbs={[{ href: '/laptops', label: 'Laptops' }, { href: `/brands/${b.slug}`, label: b.name }]}
      base={{ brand: [b.name] }}
    />
  );
}
