/**
 * Checks for the money rules and payment signatures. Run with: npm run test:unit
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { emiPerMonth, studentUnitDiscount, totals, unitPrice } from '../src/lib/pricing';
import { verifyPaymentSignature, verifyWebhookSignature } from '../src/lib/providers/razorpay';
import { parseDestination } from '../src/lib/auth/otp';
import { isAcademicEmail } from '../src/lib/students';
import { transitDays } from '../src/lib/delivery';
import { STUDENT } from '../src/lib/config';

let passed = 0;
const test = (name: string, fn: () => void) => {
  try { fn(); passed++; console.log(`ok    ${name}`); } catch (e) { console.log(`FAIL  ${name}\n      ${(e as Error).message}`); process.exitCode = 1; }
};

const product = {
  id: 'x',
  ramOptions: [{ gb: 8, price: 0 }, { gb: 16, price: 2_500_00 }],
  ssdOptions: [{ gb: 256, price: 0 }, { gb: 512, price: 2_000_00 }],
  variants: [
    { grade: 'excellent', price: 30_000_00, stock: 2, active: true },
    { grade: 'good', price: 27_000_00, stock: 0, active: false },
  ],
};

test('unit price adds upgrades and warranty', () => {
  assert.equal(unitPrice(product, { grade: 'excellent', ramGb: 16, ssdGb: 512, warrantyMonths: 24 }), 30_000_00 + 2_500_00 + 2_000_00 + 2_499_00);
});
test('unit price rejects an inactive grade or unknown upgrade', () => {
  assert.equal(unitPrice(product, { grade: 'good', ramGb: 8, ssdGb: 256, warrantyMonths: 12 }), null);
  assert.equal(unitPrice(product, { grade: 'excellent', ramGb: 64, ssdGb: 256, warrantyMonths: 12 }), null);
});
test(`student discount is ${STUDENT.percent}% of the unit`, () => {
  assert.equal(studentUnitDiscount(30_000_00), Math.round(30_000_00 * STUDENT.percent / 100));
});
test('student discount goes to the most expensive unit, limited per order', () => {
  const t = totals([{ unit: 20_000_00, qty: 1 }, { unit: 50_000_00, qty: 2 }], { student: true });
  assert.equal(t.studentDiscount, studentUnitDiscount(50_000_00) * STUDENT.maxUnitsPerOrder);
  assert.equal(t.lineStudent[0], 0);
  assert.equal(t.total, t.subtotal - t.studentDiscount);
});
test('a coupon and the student discount never stack: the bigger one wins', () => {
  const small = totals([{ unit: 40_000_00, qty: 1 }], { student: true, coupon: { code: 'X', kind: 'flat', value: 500_00, minSubtotal: 0, maxDiscount: null } });
  assert.equal(small.couponDiscount, 0);
  assert.equal(small.studentDiscount, 4_000_00);
  const big = totals([{ unit: 40_000_00, qty: 1 }], { student: true, coupon: { code: 'Y', kind: 'flat', value: 6_000_00, minSubtotal: 0, maxDiscount: null } });
  assert.equal(big.studentDiscount, 0);
  assert.equal(big.couponDiscount, 6_000_00);
});
test('coupon minimum order and percentage cap', () => {
  const under = totals([{ unit: 10_000_00, qty: 1 }], { student: false, coupon: { code: 'Z', kind: 'flat', value: 500_00, minSubtotal: 15_000_00, maxDiscount: null } });
  assert.equal(under.couponDiscount, 0);
  const capped = totals([{ unit: 50_000_00, qty: 1 }], { student: false, coupon: { code: 'P', kind: 'percent', value: 10, minSubtotal: 0, maxDiscount: 2_000_00 } });
  assert.equal(capped.couponDiscount, 2_000_00);
});
test('EMI at 15% over 12 months for ₹30,000 is about ₹2,708', () => {
  assert.ok(Math.abs(emiPerMonth(30_000_00, 12, 0.15) - 2_708_00) < 100);
});
test('Razorpay payment signature: accepts the real one, rejects a forged one', () => {
  process.env.RAZORPAY_KEY_SECRET = 'test_secret';
  const sig = crypto.createHmac('sha256', 'test_secret').update('order_1|pay_1').digest('hex');
  assert.equal(verifyPaymentSignature('order_1', 'pay_1', sig), true);
  assert.equal(verifyPaymentSignature('order_1', 'pay_2', sig), false);
  assert.equal(verifyPaymentSignature('order_1', 'pay_1', 'deadbeef'), false);
});
test('Razorpay webhook signature uses the webhook secret and raw body', () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = 'wh_secret';
  const body = JSON.stringify({ event: 'payment.captured' });
  const sig = crypto.createHmac('sha256', 'wh_secret').update(body).digest('hex');
  assert.equal(verifyWebhookSignature(body, sig), true);
  assert.equal(verifyWebhookSignature(body + ' ', sig), false);
});
test('sign-in accepts Indian mobiles in any format and emails', () => {
  assert.deepEqual(parseDestination('+91 98765 43210'), { channel: 'sms', destination: '9876543210' });
  assert.deepEqual(parseDestination('09876543210'), { channel: 'sms', destination: '9876543210' });
  assert.deepEqual(parseDestination(' Riya@Example.com '), { channel: 'email', destination: 'riya@example.com' });
  assert.equal(parseDestination('12345'), null);
  assert.equal(parseDestination('5876543210'), null);
});
test('college emails approved automatically', () => {
  assert.equal(isAcademicEmail('a@iitd.ac.in'), true);
  assert.equal(isAcademicEmail('a@student.nmims.edu.in'), true);
  assert.equal(isAcademicEmail('a@gmail.com'), false);
  assert.equal(isAcademicEmail('a@fake-ac.in'), false);
});
test('delivery estimate by PIN code', () => {
  assert.deepEqual(transitDays('560102'), [2, 4]);
  assert.deepEqual(transitDays('781001'), [6, 10]);
  assert.deepEqual(transitDays('302001'), [4, 7]);
  assert.equal(transitDays('12345'), null);
});

console.log(`\n${passed} passed${process.exitCode ? ', some failed' : ''}`);
