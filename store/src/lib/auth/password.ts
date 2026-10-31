/**
 * Password hashing with scrypt (Node's built-in), stored as scrypt$N$r$p$salt$hash.
 */
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number, opts: crypto.ScryptOptions) => Promise<Buffer>;
const N = 16_384, R = 8, PAR = 1, LEN = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, LEN, { N, r: R, p: PAR, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${PAR}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [alg, n, r, p, saltB64, keyB64] = stored.split('$');
  if (alg !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64url');
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64url'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
  });
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

const COMMON = new Set(['password', 'password1', '12345678', '123456789', '1234567890', 'qwerty123', 'iloveyou', 'admin123', 'welcome1', 'abcd1234', 'india123', 'qwertyuiop']);

/** Returns a problem with the password, or null if it is acceptable. */
export function passwordProblem(pw: string, context: (string | null | undefined)[] = []): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.';
  if (pw.length > 200) return 'That password is too long.';
  if (COMMON.has(pw.toLowerCase())) return 'That password is too common. Choose another.';
  if (/^(.)\1+$/.test(pw)) return 'Use a password that is not one repeated character.';
  for (const c of context) if (c && c.length >= 4 && pw.toLowerCase().includes(c.toLowerCase().split('@')[0])) return 'Don’t use your email or phone number in the password.';
  return null;
}
