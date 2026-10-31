import Link from 'next/link';
import ProductEditor, { BLANK } from '../ProductEditor';

export default function NewLaptop() {
  return (
    <div>
      <Link href="/admin/products" className="link text-[14px]">Prices and stock</Link>
      <h1 className="mt-3 text-[38px]">Add a laptop</h1>
      <p className="mt-2 max-w-[70ch] text-mute">It goes on sale as soon as you add it with a price and stock for at least one grade. You can upload photos on the next screen.</p>
      <div className="mt-6"><ProductEditor initial={BLANK} /></div>
    </div>
  );
}
