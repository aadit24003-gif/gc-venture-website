'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { ArtSpec, ProductImage } from '@/lib/db/schema';
import LaptopArt from '../LaptopArt';

export default function Gallery({ images, art, brand, slug, title }: { images: ProductImage[]; art: ArtSpec; brand: string; slug: string; title: string }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="well aspect-[4/3] rounded-[24px] border border-line p-10"><LaptopArt art={art} brand={brand} slug={slug} title={title} /></div>;
  const cur = images[Math.min(i, images.length - 1)];
  return (
    <div>
      <div className="well relative aspect-[4/3] overflow-hidden rounded-[24px] border border-line p-6 md:p-10">
        <Image key={cur.src} src={cur.src} alt={cur.alt || title} width={cur.width} height={cur.height} priority sizes="(min-width: 1024px) 640px, 100vw" className="h-full w-full animate-[fade_.3s_ease] object-contain" />
        <span className="absolute bottom-3 left-3 rounded-md bg-canvas px-2 py-1 text-[11.5px] text-mute">Manufacturer’s photo of the model</span>
      </div>
      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="Photos">
          {images.map((im, n) => (
            <li key={im.src}>
              <button type="button" onClick={() => setI(n)} aria-label={`Photo ${n + 1} of ${images.length}`} aria-current={n === i}
                className={`well aspect-[4/3] w-full rounded-xl border p-1.5 transition ${n === i ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-line-2'}`}>
                <Image src={im.src} alt="" width={im.width} height={im.height} sizes="120px" className="h-full w-full object-contain" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
