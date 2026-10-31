import type { Metadata } from 'next';
import { parseFilters, USES } from '@/lib/filters';
import { CHECK_COUNT, POLICY } from '@/lib/config';
import ListingPage from '@/components/catalogue/ListingPage';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = parseFilters(await searchParams);
  const brand = f.brand.length === 1 ? (f.brand[0] === 'Apple' ? 'MacBooks' : `${f.brand[0]} laptops`) : 'laptops';
  const use = USES.find((u) => u.key === f.use);
  return {
    title: `Refurbished ${brand}${use ? ` for ${use.label.toLowerCase()}` : ''}`,
    description: `Certified refurbished ${brand}: every unit listed with its grade, measured battery health and inspection report, with a ${POLICY.warrantyMonths}-month warranty.`,
    alternates: { canonical: '/laptops' },
  };
}

export default async function LaptopsPage({ searchParams }: Props) {
  return (
    <ListingPage
      sp={await searchParams} path="/laptops"
      title="Refurbished laptops"
      intro={<>Every listing is a real, inspected unit: {CHECK_COUNT} checks, a cosmetic grade, measured battery and SSD health, and a {POLICY.warrantyMonths}-month warranty.</>}
      crumbs={[{ href: '/laptops', label: 'Laptops' }]}
    />
  );
}
