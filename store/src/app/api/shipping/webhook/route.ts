/**
 * Shiprocket tracking webhook. In Shiprocket → Settings → API → Webhooks, set the URL to
 * <site>/api/shipping/webhook and the token to SHIPROCKET_WEBHOOK_TOKEN.
 */
import { safeEqual } from '@/lib/auth/secret';
import { mapShiprocketStatus, orderByAwb } from '@/lib/shipping';
import { setStatus } from '@/lib/orders';
import { NEXT_STATUS } from '@/lib/order-status';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  const got = req.headers.get('x-api-key') ?? '';
  if (!expected || !safeEqual(expected, got)) return new Response('unauthorised', { status: 401 });
  const body = (await req.json().catch(() => null)) as { awb?: string | number; current_status?: string; shipment_status?: string; scans?: { location?: string }[] } | null;
  if (!body?.awb) return Response.json({ ok: true, ignored: 'no awb' });
  const o = await orderByAwb(String(body.awb));
  if (!o) return Response.json({ ok: true, ignored: 'unknown awb' });
  const next = mapShiprocketStatus(body.current_status ?? body.shipment_status ?? '');
  if (next && next !== o.status && (NEXT_STATUS[o.status] ?? []).includes(next)) {
    await setStatus(o.id, next, { note: `Courier update: ${body.current_status}`, location: body.scans?.at(-1)?.location ?? undefined }, null);
  }
  return Response.json({ ok: true });
}
