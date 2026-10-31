/** Staff-only: streams a photo a customer attached to a return or warranty request. */
import { getViewer } from '@/lib/auth/session';
import { getPrivate } from '@/lib/providers/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const v = await getViewer();
  if (!v?.can('service.manage')) return new Response('Not allowed', { status: 403 });
  const key = new URL(req.url).searchParams.get('key') ?? '';
  if (!/^service\/[A-Z0-9-]+\/[\w.-]+\.jpg$/.test(key)) return new Response('Bad key', { status: 400 });
  const file = await getPrivate(key).catch(() => null);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(file), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' } });
}
