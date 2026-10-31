import type { Metadata } from 'next';
import { eq, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { studentVerifications } from '@/lib/db/schema';
import AdminNav from './AdminNav';

export const metadata: Metadata = { title: 'Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const d = await db();
  const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(studentVerifications).where(eq(studentVerifications.status, 'pending'));
  return (
    <div className="wrap grid gap-8 pb-10 pt-8 lg:grid-cols-[220px_1fr]">
      <AdminNav pendingStudents={n} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
