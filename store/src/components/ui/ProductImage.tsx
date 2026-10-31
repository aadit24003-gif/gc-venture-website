import Image from 'next/image';
import type { ArtSpec, ProductImage as Img } from '@/lib/db/schema';
import LaptopArt from '../LaptopArt';

/** The model's photo on white, or the drawn laptop when there is no photo. */
export default function ProductImage({ image, art, brand, slug, title, sizes = '(min-width: 1024px) 25vw, 50vw', priority, className = '' }: {
  image: Img | null | undefined; art: ArtSpec; brand: string; slug: string; title: string; sizes?: string; priority?: boolean; className?: string;
}) {
  if (image) {
    return (
      <Image
        src={image.src} alt={image.alt || title} width={image.width || 1200} height={image.height || 800}
        sizes={sizes} priority={priority}
        className={`h-full w-full object-contain ${className}`}
      />
    );
  }
  return <LaptopArt art={art} brand={brand} slug={slug} title={title} className={className} />;
}
