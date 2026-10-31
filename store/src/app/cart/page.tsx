import type { Metadata } from 'next';
import CartPage from '@/components/cart/CartPage';
import { cardProducts } from '@/lib/products';

export const metadata: Metadata = { title: 'Your cart', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Cart() {
  const picks = (await cardProducts()).filter((c) => c.inStock && c.featured).slice(0, 4);
  return (
    <div className="wrap pb-10 pt-8 md:pt-12">
      <h1 className="text-[36px] md:text-[48px]">Your cart</h1>
      <CartPage picks={picks} />
    </div>
  );
}
