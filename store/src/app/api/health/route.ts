/**
 * Health check for uptime monitors and the hosting platform: confirms the app can reach the
 * database. Returns 200 with { ok: true } or 503. Reveals no configuration values.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const started = Date.now();
  try {
    const d = await db();
    await d.execute(sql`select 1`);
    return Response.json({ ok: true, db: 'up', ms: Date.now() - started }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ ok: false, db: 'down' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
