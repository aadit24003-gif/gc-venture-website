import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { cutoutWebp } from '@/lib/cutout';
import { readLocalPublic } from '@/lib/providers/storage';
import { BRAND } from '@/lib/config';

/**
 * A model's main photo without its white background, made on request and cached.
 * Lets staff put any model, including ones with photos uploaded in admin, on a dark
 * home-page tile (Admin → Home page). ?n=2 uses the model's second photo.
 */
const cache = new Map<string, Buffer>();

async function load(src: string): Promise<Buffer | null> {
  if (src.startsWith('/media/')) return readLocalPublic(src.slice('/media/'.length));
  if (src.startsWith('/')) {
    try { return await fs.readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', src.replace(/^\//, ''))); } catch { /* fall back to HTTP */ }
    const r = await fetch(new URL(src, BRAND.url));
    return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
  }
  if (!/^https:\/\//.test(src)) return null;
  const r = await fetch(src);
  return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) return new Response('Not found', { status: 404 });
  const n = Math.max(1, Math.min(8, Number(new URL(req.url).searchParams.get('n')) || 1));
  const d = await db();
  const [p] = await d.select({ images: products.images }).from(products).where(eq(products.slug, slug)).limit(1);
  const src = p?.images[n - 1]?.src;
  if (!src) return new Response('Not found', { status: 404 });
  const key = `${slug}:${src}`;
  let out = cache.get(key);
  if (!out) {
    const input = await load(src);
    if (!input) return new Response('Not found', { status: 404 });
    out = await cutoutWebp(input);
    if (cache.size > 60) cache.clear();
    cache.set(key, out);
  }
  return new Response(new Uint8Array(out), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } });
}
