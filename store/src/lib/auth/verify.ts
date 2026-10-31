import { BRAND } from '../config';
import { notify } from '../notify';
import { createToken } from './tokens';

/** Emails a 24-hour link that confirms the address belongs to the account. */
export async function sendVerificationEmail(userId: string, email: string, name: string | null) {
  const token = await createToken(userId, 'verify_email', 24 * 60);
  await notify('verify_email', { email }, { name: name ?? 'there', link: `${BRAND.url}/verify-email/${token}` }, 'verify');
}

/** Uses a verify-email link. Returns false if it is invalid, used or expired. */
export async function confirmEmailToken(token: string): Promise<boolean> {
  const { consumeToken } = await import('./tokens');
  const { db } = await import('../db');
  const { users } = await import('../db/schema');
  const { eq } = await import('drizzle-orm');
  const userId = await consumeToken(token, 'verify_email');
  if (!userId) return false;
  const d = await db();
  await d.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  return true;
}
