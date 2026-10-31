/**
 * Price rules shared by the browser (to show prices) and the server (to charge them).
 * The server always recomputes from the database; the browser's numbers are only a preview.
 */
import { POLICY, STUDENT, GRADES, type GradeKey } from './config';
import type { UpgradeOption } from './db/schema';

export const isGrade = (g: string): g is GradeKey => g in GRADES;

/** Extra cost to go from the memory/storage a unit has to a larger option. null if not offered. */
export function upgradeCost(options: UpgradeOption[], installed: number, chosen: number): number | null {
  if (chosen === installed) return 0;
  if (chosen < installed) return null;
  const c = options.find((o) => o.gb === chosen);
  if (!c) return null;
  const i = options.find((o) => o.gb === installed);
  return Math.max(0, c.price - (i?.price ?? 0));
}

/** Upgrade choices for a unit: only sizes at or above what it has. */
export function upgradeChoices(options: UpgradeOption[], installed: number): { gb: number; extra: number }[] {
  const out = [{ gb: installed, extra: 0 }];
  for (const o of options) {
    if (o.gb <= installed) continue;
    const extra = upgradeCost(options, installed, o.gb);
    if (extra != null) out.push({ gb: o.gb, extra });
  }
  return out.sort((a, b) => a.gb - b.gb);
}

export function warrantyCost(months: number): number | null {
  return POLICY.warrantyExtensions.find((w) => w.months === months)?.price ?? null;
}

/** Price of one unit as configured (its price + upgrades + warranty), or null if the choice is invalid. */
export function linePrice(
  unit: { price: number; ramGb: number; ssdGb: number },
  product: { ramOptions: UpgradeOption[]; ssdOptions: UpgradeOption[] },
  sel: { ramGb: number; ssdGb: number; warrantyMonths: number },
): number | null {
  const ram = upgradeCost(product.ramOptions, unit.ramGb, sel.ramGb);
  const ssd = upgradeCost(product.ssdOptions, unit.ssdGb, sel.ssdGb);
  const w = warrantyCost(sel.warrantyMonths);
  if (ram == null || ssd == null || w == null) return null;
  return unit.price + ram + ssd + w;
}

/** Student discount on one unit (paise). */
export function studentUnitDiscount(unit: number): number {
  const d = Math.round((unit * STUDENT.percent) / 100);
  return STUDENT.maxDiscountPerUnit == null ? d : Math.min(d, STUDENT.maxDiscountPerUnit);
}

export type Coupon = {
  code: string; kind: string; value: number; minSubtotal: number; maxDiscount: number | null;
  productIds?: string[]; brands?: string[];
};
export type ShippingRules = { flatFee: number; freeAbove: number; codFee: number };

export type Totals = {
  subtotal: number;
  studentDiscount: number;
  couponDiscount: number;
  couponCode: string | null;
  couponNote: string | null;
  shippingFee: number;
  codFee: number;
  total: number;
  /** Per line, how much student discount it received. */
  lineStudent: number[];
};

export type TotalsLine = { unit: number; qty: number; productId?: string; brand?: string };

const rupeeText = (p: number) => `₹${(p / 100).toLocaleString('en-IN')}`;

/**
 * Totals for a cart. Student discount goes to the most expensive units first, up to
 * STUDENT.maxUnitsPerOrder units. A coupon and the student discount do not stack:
 * whichever saves more is applied. Coupons limited to products or brands apply to those lines only.
 */
export function totals(lines: TotalsLine[], opts: { student: boolean; coupon?: Coupon | null; cod?: boolean; shipping?: ShippingRules }): Totals {
  const subtotal = lines.reduce((n, l) => n + l.unit * l.qty, 0);

  const lineStudent = lines.map(() => 0);
  if (opts.student) {
    let left: number = STUDENT.maxUnitsPerOrder;
    const order = lines.map((l, i) => ({ ...l, i })).sort((a, b) => b.unit - a.unit);
    for (const l of order) {
      const n = Math.min(left, l.qty);
      if (n <= 0) break;
      lineStudent[l.i] = studentUnitDiscount(l.unit) * n;
      left -= n;
    }
  }
  const student = lineStudent.reduce((a, b) => a + b, 0);

  let coupon = 0;
  let couponNote: string | null = null;
  const c = opts.coupon;
  if (c) {
    const limited = (c.productIds?.length ?? 0) > 0 || (c.brands?.length ?? 0) > 0;
    const eligible = limited
      ? lines.filter((l) => (l.productId && c.productIds?.includes(l.productId)) || (l.brand && c.brands?.includes(l.brand))).reduce((n, l) => n + l.unit * l.qty, 0)
      : subtotal;
    if (limited && eligible === 0) couponNote = 'This code doesn’t apply to the laptops in your cart.';
    else if (subtotal < c.minSubtotal) couponNote = `This code needs an order of at least ${rupeeText(c.minSubtotal)}.`;
    else {
      coupon = c.kind === 'percent' ? Math.round((eligible * c.value) / 100) : Math.min(c.value, eligible);
      if (c.maxDiscount != null) coupon = Math.min(coupon, c.maxDiscount);
      coupon = Math.min(coupon, eligible);
    }
  }

  let studentDiscount = student;
  let couponDiscount = coupon;
  if (student && coupon) {
    if (coupon > student) {
      studentDiscount = 0;
      lineStudent.fill(0);
      couponNote = 'Your coupon saves more than the student discount, so we used the coupon.';
    } else {
      couponDiscount = 0;
      couponNote = 'Your student discount saves more than this coupon, so we kept the student discount.';
    }
  }

  const ship = opts.shipping ?? { flatFee: POLICY.shippingFee, freeAbove: 0, codFee: POLICY.cod.fee };
  const afterDiscount = subtotal - studentDiscount - couponDiscount;
  const shippingFee = lines.length === 0 ? 0 : ship.freeAbove > 0 && afterDiscount >= ship.freeAbove ? 0 : ship.flatFee;
  const codFee = opts.cod ? ship.codFee : 0;
  const total = Math.max(0, afterDiscount + shippingFee + codFee);
  return {
    subtotal, studentDiscount, couponDiscount, couponCode: couponDiscount ? c?.code ?? null : null,
    couponNote, shippingFee, codFee, total, lineStudent,
  };
}

/** Monthly instalment for a card EMI at POLICY.emi.annualRate (bank interest, estimate only). */
export function emiPerMonth(amount: number, months: number, annualRate: number = POLICY.emi.annualRate): number {
  const r = annualRate / 12;
  if (!r) return Math.ceil(amount / months);
  const f = Math.pow(1 + r, months);
  return Math.ceil((amount * r * f) / (f - 1));
}

/** Lowest monthly EMI on offer (longest tenure). */
export const emiFrom = (amount: number) =>
  amount >= POLICY.emi.minOrder ? emiPerMonth(amount, Math.max(...POLICY.emi.tenures)) : null;

/** Percentage saved against the approximate new price. */
export const savedPct = (price: number, newPrice: number | null | undefined) =>
  newPrice && newPrice > price ? Math.round(((newPrice - price) / newPrice) * 100) : null;
