/**
 * Price rules shared by the browser (to show prices) and the server (to charge them).
 * The server always recomputes from the database; the browser's numbers are only a preview.
 */
import { POLICY, STUDENT, GRADES, type GradeKey } from './config';
import type { UpgradeOption } from './db/schema';

export type Selection = {
  productId: string;
  grade: GradeKey;
  ramGb: number;
  ssdGb: number;
  warrantyMonths: number;
  qty: number;
};

export type PricedProduct = {
  id: string;
  ramOptions: UpgradeOption[];
  ssdOptions: UpgradeOption[];
  variants: { grade: string; price: number; stock: number; active: boolean }[];
};

export const isGrade = (g: string): g is GradeKey => g in GRADES;

/** Price of one configured laptop (grade + upgrades + warranty), or null if the choice is invalid. */
export function unitPrice(p: PricedProduct, s: Pick<Selection, 'grade' | 'ramGb' | 'ssdGb' | 'warrantyMonths'>): number | null {
  const v = p.variants.find((x) => x.grade === s.grade && x.active);
  const ram = p.ramOptions.find((o) => o.gb === s.ramGb);
  const ssd = p.ssdOptions.find((o) => o.gb === s.ssdGb);
  const w = POLICY.warrantyExtensions.find((o) => o.months === s.warrantyMonths);
  if (!v || !ram || !ssd || !w) return null;
  return v.price + ram.price + ssd.price + w.price;
}

/** Student discount on one unit (paise). */
export function studentUnitDiscount(unit: number): number {
  const d = Math.round((unit * STUDENT.percent) / 100);
  return STUDENT.maxDiscountPerUnit == null ? d : Math.min(d, STUDENT.maxDiscountPerUnit);
}

export type Coupon = { code: string; kind: string; value: number; minSubtotal: number; maxDiscount: number | null };

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

/**
 * Totals for a cart. Student discount goes to the most expensive units first, up to
 * STUDENT.maxUnitsPerOrder units. A coupon and the student discount do not stack:
 * whichever saves more is applied.
 */
export function totals(lines: { unit: number; qty: number }[], opts: { student: boolean; coupon?: Coupon | null; cod?: boolean }): Totals {
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
    if (subtotal < c.minSubtotal) couponNote = `This code needs an order of at least ₹${(c.minSubtotal / 100).toLocaleString('en-IN')}.`;
    else {
      coupon = c.kind === 'percent' ? Math.round((subtotal * c.value) / 100) : c.value;
      if (c.maxDiscount != null) coupon = Math.min(coupon, c.maxDiscount);
      coupon = Math.min(coupon, subtotal);
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

  const shippingFee = POLICY.shippingFee;
  const codFee = opts.cod ? POLICY.cod.fee : 0;
  const total = Math.max(0, subtotal - studentDiscount - couponDiscount + shippingFee + codFee);
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
