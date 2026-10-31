import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { publishedPosts } from '@/lib/cms';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Guides and news', description: 'Buying guides for refurbished business laptops and MacBooks, and news from the workshop.', alternates: { canonical: '/blog' } };

export default async function Blog() {
  const list = await publishedPosts();
  return (
    <div className="wrap pb-10 pt-10 md:pt-14">
      <p className="eyebrow">Guides and news</p>
      <h1 className="mt-3 text-[40px] md:text-[56px]">From the workshop</h1>
      <p className="mt-3 max-w-[60ch] text-[17px] text-mute">How to choose a refurbished laptop, what we look for on the bench, and model comparisons.</p>
      {list.length === 0 ? (
        <p className="mt-10 rounded-[20px] border border-dashed border-line-2 p-10 text-center text-mute">Our first guides are being written. Meanwhile, see <Link href="/how-we-test" className="link">how we test</Link> or <Link href="/faq" className="link">common questions</Link>.</p>
      ) : (
        <ul className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <li key={p.id}>
              <Link href={`/blog/${p.slug}`} className="group block h-full overflow-hidden rounded-[20px] border border-line bg-white transition hover:shadow-[var(--shadow-lift)]">
                {p.cover && <div className="well aspect-[16/9] p-6"><Image src={p.cover} alt="" width={800} height={450} className="h-full w-full object-contain" /></div>}
                <div className="p-5"><p className="text-[12.5px] text-mute">{formatDate(p.publishedAt)} · {p.authorName}</p><h2 className="mt-2 text-[21px] group-hover:underline">{p.title}</h2><p className="mt-2 text-[15px] text-mute">{p.excerpt}</p></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
