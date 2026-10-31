import { eq } from 'drizzle-orm';
import { getViewer } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { studentVerifications } from '@/lib/db/schema';
import { getPrivate } from '@/lib/providers/storage';

export const dynamic = 'force-dynamic';

/** Streams a student ID photo to an admin. Never cached, never public. */
export async function GET(req: Request) {
  const v = await getViewer();
  if (!v?.isAdmin) return new Response('Not found', { status: 404 });
  const url = new URL(req.url);
  const id = Number(url.searchParams.get('id'));
  const side = url.searchParams.get('side') === 'back' ? 'back' : 'front';
  if (!Number.isInteger(id)) return new Response('Not found', { status: 404 });
  const d = await db();
  const [row] = await d.select().from(studentVerifications).where(eq(studentVerifications.id, id)).limit(1);
  const key = side === 'back' ? row?.idBackKey : row?.idFrontKey;
  if (!key) return new Response('Not found', { status: 404 });
  const file = await getPrivate(key);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' },
  });
}
