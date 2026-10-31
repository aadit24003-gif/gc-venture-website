import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewer } from '@/lib/auth/session';
import { recentIds, wishlistIds } from '@/lib/shopping';
import { cardProducts } from '@/lib/products';
import ProductCard from '@/components/ProductCard';

export const metadata: Metadata = { title: 'Recently viewed', robots: { index: false } };

export default async function Recent() {
  const v = await requireViewer('/account/recent');
  const [ids, all, wished] = await Promise.all([recentIds(v.user.id, 30), cardProducts(), wishlistIds(v.user.id)]);
  const items = ids.map((id) => all.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  return (
    <div>
      <h1 className="text-[32px]">Recently viewed</h1>
      {items.length === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-line-2 p-10 text-center"><p className="text-mute">Laptops you look at will appear here.</p><Link href="/laptops" className="btn btn-primary mt-4">Browse laptops</Link></div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((p) => <li key={p.id}><ProductCard p={p} wished={wished.includes(p.id)} /></li>)}</ul>
      )}
    </div>
  );
}
