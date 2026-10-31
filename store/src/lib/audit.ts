/**
 * Audit log: who changed what, for every staff action and every money movement.
 */
import { db } from './db';
import { auditLogs } from './db/schema';

type Actor = { user: { id: string; name: string | null; email: string | null; phone: string | null } } | null;

export async function audit(actor: Actor, action: string, entity: string, entityId: string | number | null, data?: unknown, ip?: string | null) {
  try {
    const d = await db();
    const u = actor?.user;
    await d.insert(auditLogs).values({
      actorId: u?.id ?? null,
      actorLabel: u ? (u.name || u.email || u.phone || u.id) : 'system',
      action, entity, entityId: entityId == null ? null : String(entityId),
      data: data === undefined ? null : JSON.parse(JSON.stringify(data)),
      ip: ip ?? null,
    });
  } catch (e) {
    console.error('audit log failed', action, e);
  }
}
