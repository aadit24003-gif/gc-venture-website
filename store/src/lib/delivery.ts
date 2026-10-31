/**
 * Delivery estimate from a 6-digit PIN code. Courier transit times are approximate:
 * metro PINs 2–4 days, most of India 4–7, the North-East, Ladakh/J&K and islands 6–10.
 * [CONFIRM] against the courier you use.
 */
import { POLICY } from './config';

const METRO_PREFIXES = ['11', '12', '13', '201', '400', '401', '410', '411', '412', '500', '501', '560', '562', '600', '601', '603', '700', '380', '382'];
const REMOTE_PREFIXES = ['18', '19', '78', '79', '744', '682555'];

export function transitDays(pin: string): [number, number] | null {
  if (!/^[1-9]\d{5}$/.test(pin)) return null;
  if (REMOTE_PREFIXES.some((p) => pin.startsWith(p))) return [6, 10];
  if (METRO_PREFIXES.some((p) => pin.startsWith(p))) return [2, 4];
  return [4, 7];
}

/** Adds business days (Mon–Sat) to a date. */
function addWorkingDays(from: Date, n: number) {
  const d = new Date(from);
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) left--;
  }
  return d;
}

export function deliveryWindow(pin: string, from = new Date()): { from: Date; to: Date } | null {
  const t = transitDays(pin);
  if (!t) return null;
  return {
    from: addWorkingDays(from, POLICY.dispatchDays.min + t[0]),
    to: addWorkingDays(from, POLICY.dispatchDays.max + t[1]),
  };
}

export const shortDate = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
