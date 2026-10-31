import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewer } from '@/lib/auth/session';
import { wishlistIds } from '@/lib/shopping';
import { cardProducts } from '@/lib/products';
import ProductCard from '@/components/ProductCard';

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false } };

export default async function Wishlist() {
  const v = await requireViewer('/account/wishlist');
  const [ids, all] = await Promise.all([wishlistIds(v.user.id), cardProducts()]);
  const items = ids.map((id) => all.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  return (
    <div>
      <h1 className="text-[32px]">Wishlist</h1>
      <p className="mt-2 text-mute">Models you saved. Prices and units change as stock comes and goes.</p>
      {items.length === 0 ? (
        <div className="mt-8 rounded-[20px] border border-dashed border-line-2 p-10 text-center"><p className="font-semibold">Nothing saved yet</p><p className="mt-1 text-mute">Tap the heart on any laptop to save it here.</p><Link href="/laptops" className="btn btn-primary mt-4">Browse laptops</Link></div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((p) => <li key={p.id}><ProductCard p={p} wished /></li>)}</ul>
      )}
    </div>
  );
}
