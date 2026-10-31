import LaptopArt from '@/components/LaptopArt';
import { cardProducts } from '@/lib/products';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const items = await cardProducts();
  return (
    <div className="wrap grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
      {items.map((p) => (
        <div key={p.id} className="card p-4">
          <LaptopArt art={p.art} brand={p.brand} slug={p.slug} />
          <p className="mt-2 font-semibold">{p.title}</p>
        </div>
      ))}
    </div>
  );
}
