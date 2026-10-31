import { readLocalPublic } from '@/lib/providers/storage';

/** Serves product photos stored on the local disk (development without Supabase). */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const file = await readLocalPublic(key.join('/'));
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(file), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
