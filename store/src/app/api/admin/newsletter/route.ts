/** Staff-only CSV export of newsletter subscribers. */
import { desc } from 'drizzle-orm';
import { getViewer } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const v = await getViewer();
  if (!v?.can('newsletter.view')) return new Response('Not allowed', { status: 403 });
  const d = await db();
  const rows = await d.select().from(subscribers).orderBy(desc(subscribers.createdAt));
  await audit(v, 'newsletter.export', 'newsletter', null, { rows: rows.length });
  const esc = (s: string | null) => `"${(s ?? '').replace(/"/g, '""')}"`;
  const csv = ['email,status,source,subscribed_at,unsubscribed_at', ...rows.map((r) => [esc(r.email), r.status, esc(r.source), r.createdAt.toISOString(), r.unsubscribedAt?.toISOString() ?? ''].join(','))].join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
