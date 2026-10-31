import type { Metadata } from 'next';
import ListingPage from '@/components/catalogue/ListingPage';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Deals on refurbished laptops', description: 'The biggest savings against new, on inspected business laptops and MacBooks.', alternates: { canonical: '/deals' } };

export default async function Deals({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <ListingPage
      sp={await searchParams} path="/deals"
      title="Deals"
      intro="Sorted by how much you save against each model’s approximate launch price in India. Same inspection, same warranty."
      crumbs={[{ href: '/deals', label: 'Deals' }]}
      defaults={{ sort: 'discount' }}
    />
  );
}
