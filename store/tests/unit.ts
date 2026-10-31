/**
 * Checks for the money rules, permissions and security helpers. Run with: npm run test:unit
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { emiPerMonth, linePrice, studentUnitDiscount, totals, upgradeChoices, upgradeCost } from '../src/lib/pricing';
import { verifyPaymentSignature, verifyWebhookSignature } from '../src/lib/providers/razorpay';
import { parseDestination } from '../src/lib/auth/otp';
import { hashPassword, passwordProblem, verifyPassword } from '../src/lib/auth/password';
import { isAcademicEmail } from '../src/lib/students';
import { transitDays } from '../src/lib/delivery';
import { gstFromInclusive } from '../src/lib/tax';
import { can } from '../src/lib/rbac';
import { NEXT_STATUS, timelineIndex } from '../src/lib/order-status';
import { applyFilters, parseFilters, toQuery, EMPTY } from '../src/lib/filters';
import { Markdown } from '../src/lib/markdown';
import { classify } from '../src/lib/catalogue';
import { mapShiprocketStatus } from '../src/lib/shipping';
import { STUDENT } from '../src/lib/config';
import type { CardProduct } from '../src/lib/products';

let passed = 0;
const pending: Promise<void>[] = [];
const test = (name: string, fn: () => void | Promise<void>) => {
  const run = async () => {
    try { await fn(); passed++; console.log(`ok    ${name}`); } catch (e) { console.log(`FAIL  ${name}\n      ${(e as Error).message}`); process.exitCode = 1; }
  };
  pending.push(run());
};

const product = { ramOptions: [{ gb: 8, price: 0 }, { gb: 16, price: 2_500_00 }, { gb: 32, price: 6_500_00 }], ssdOptions: [{ gb: 256, price: 0 }, { gb: 512, price: 2_000_00 }] };

/* ── Prices ─────────────────────────────────────────────────── */
test('a unit’s price adds upgrades and the warranty extension', () => {
  assert.equal(linePrice({ price: 30_000_00, ramGb: 8, ssdGb: 256 }, product, { ramGb: 16, ssdGb: 512, warrantyMonths: 24 }), 30_000_00 + 2_500_00 + 2_000_00 + 2_499_00);
});
test('upgrades are charged from what the unit already has', () => {
  assert.equal(upgradeCost(product.ramOptions, 16, 32), 4_000_00);
  assert.equal(upgradeCost(product.ramOptions, 16, 8), null); // no downgrades
  assert.deepEqual(upgradeChoices(product.ramOptions, 16).map((c) => c.gb), [16, 32]);
});
test('an unknown configuration has no price', () => {
  assert.equal(linePrice({ price: 30_000_00, ramGb: 8, ssdGb: 256 }, product, { ramGb: 64, ssdGb: 256, warrantyMonths: 12 }), null);
  assert.equal(linePrice({ price: 30_000_00, ramGb: 8, ssdGb: 256 }, product, { ramGb: 8, ssdGb: 256, warrantyMonths: 36 }), null);
});
test(`student discount is ${STUDENT.percent}% of the unit`, () => {
  assert.equal(studentUnitDiscount(30_000_00), Math.round(30_000_00 * STUDENT.percent / 100));
});
test('student discount goes to the most expensive unit, limited per order', () => {
  const t = totals([{ unit: 20_000_00, qty: 1 }, { unit: 50_000_00, qty: 1 }, { unit: 50_000_00, qty: 1 }], { student: true });
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
test('brand-limited coupon applies only to that brand’s laptops', () => {
  const lines = [{ unit: 40_000_00, qty: 1, brand: 'Lenovo', productId: 'a' }, { unit: 60_000_00, qty: 1, brand: 'Apple', productId: 'b' }];
  const t = totals(lines, { student: false, coupon: { code: 'TP', kind: 'percent', value: 10, minSubtotal: 0, maxDiscount: null, brands: ['Lenovo'] } });
  assert.equal(t.couponDiscount, 4_000_00);
  const none = totals([lines[1]], { student: false, coupon: { code: 'TP', kind: 'percent', value: 10, minSubtotal: 0, maxDiscount: null, brands: ['Lenovo'] } });
  assert.equal(none.couponDiscount, 0);
  assert.match(none.couponNote ?? '', /doesn’t apply/);
});
test('delivery fee, free-above threshold and COD fee come from settings', () => {
  const ship = { flatFee: 199_00, freeAbove: 30_000_00, codFee: 99_00 };
  assert.equal(totals([{ unit: 20_000_00, qty: 1 }], { student: false, shipping: ship }).shippingFee, 199_00);
  assert.equal(totals([{ unit: 35_000_00, qty: 1 }], { student: false, shipping: ship }).shippingFee, 0);
  const cod = totals([{ unit: 20_000_00, qty: 1 }], { student: false, shipping: ship, cod: true });
  assert.equal(cod.total, 20_000_00 + 199_00 + 99_00);
});
test('EMI at 15% over 12 months for ₹30,000 is about ₹2,708', () => {
  assert.ok(Math.abs(emiPerMonth(30_000_00, 12, 0.15) - 2_708_00) < 100);
});

/* ── Tax ────────────────────────────────────────────────────── */
test('GST: same state splits into CGST + SGST, other states pay IGST', () => {
  const t = { gstRate: 18, scheme: 'regular' as const, sellerState: 'Haryana', hsn: '8471' };
  const local = gstFromInclusive(118_000_00, t, 'Haryana');
  assert.equal(local.taxable, 100_000_00);
  assert.equal(local.cgst + local.sgst, 18_000_00);
  assert.equal(local.igst, 0);
  const away = gstFromInclusive(118_000_00, t, 'Karnataka');
  assert.equal(away.igst, 18_000_00);
  assert.equal(gstFromInclusive(50_000_00, { ...t, scheme: 'margin' }, 'Karnataka').tax, 0);
});

/* ── Payments ───────────────────────────────────────────────── */
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

/* ── Accounts and permissions ──────────────────────────────── */
test('sign-in accepts Indian mobiles in any format and emails', () => {
  assert.deepEqual(parseDestination('+91 98765 43210'), { channel: 'sms', destination: '9876543210' });
  assert.deepEqual(parseDestination('09876543210'), { channel: 'sms', destination: '9876543210' });
  assert.deepEqual(parseDestination(' Riya@Example.com '), { channel: 'email', destination: 'riya@example.com' });
  assert.equal(parseDestination('12345'), null);
  assert.equal(parseDestination('5876543210'), null);
});
test('passwords are hashed with a salt and checked in constant time', async () => {
  const h1 = await hashPassword('correct horse battery');
  const h2 = await hashPassword('correct horse battery');
  assert.notEqual(h1, h2);
  assert.equal(await verifyPassword('correct horse battery', h1), true);
  assert.equal(await verifyPassword('wrong', h1), false);
  assert.equal(await verifyPassword('x', null), false);
});
test('weak passwords are refused', () => {
  assert.ok(passwordProblem('short'));
  assert.ok(passwordProblem('password1'));
  assert.ok(passwordProblem('riya2024abc', ['riya@example.com']));
  assert.equal(passwordProblem('blue kettle on the hill'), null);
});
test('staff roles: each sees only its own areas', () => {
  assert.equal(can('customer', 'dashboard.view'), false);
  assert.equal(can('support', 'tickets.manage'), true);
  assert.equal(can('support', 'refunds.manage'), false);
  assert.equal(can('inventory_manager', 'inventory.cost'), true);
  assert.equal(can('order_manager', 'inventory.cost'), false);
  assert.equal(can('order_manager', 'settings.manage'), false);
  assert.equal(can('super_admin', 'settings.manage'), true);
});
test('college emails approved automatically', () => {
  assert.equal(isAcademicEmail('a@iitd.ac.in'), true);
  assert.equal(isAcademicEmail('a@student.nmims.edu.in'), true);
  assert.equal(isAcademicEmail('a@gmail.com'), false);
  assert.equal(isAcademicEmail('a@fake-ac.in'), false);
});

/* ── Orders and shipping ───────────────────────────────────── */
test('the 8-step tracker and allowed status moves', () => {
  assert.equal(timelineIndex('awaiting_payment'), 0);
  assert.equal(timelineIndex('confirmed'), 1);
  assert.equal(timelineIndex('delivered'), 7);
  assert.ok(NEXT_STATUS.packed.includes('shipped'));
  assert.ok(!NEXT_STATUS.confirmed.includes('delivered'));
  assert.equal(NEXT_STATUS.delivered.includes('cancelled'), false);
});
test('courier statuses map to order statuses', () => {
  assert.equal(mapShiprocketStatus('OUT FOR DELIVERY'), 'out_for_delivery');
  assert.equal(mapShiprocketStatus('Delivered'), 'delivered');
  assert.equal(mapShiprocketStatus('IN TRANSIT'), 'in_transit');
  assert.equal(mapShiprocketStatus('RTO DELIVERED'), 'returned');
  assert.equal(mapShiprocketStatus('Pickup scheduled'), null);
});
test('delivery estimate by PIN code', () => {
  assert.deepEqual(transitDays('560102'), [2, 4]);
  assert.deepEqual(transitDays('781001'), [6, 10]);
  assert.deepEqual(transitDays('302001'), [4, 7]);
  assert.equal(transitDays('12345'), null);
});

/* ── Catalogue ──────────────────────────────────────────────── */
const card = (o: Partial<CardProduct>): CardProduct => ({
  id: 'x', slug: 'x', title: 'Lenovo ThinkPad X', brand: 'Lenovo', family: 'ThinkPad', model: 'X', year: 2021, cpu: 'Intel Core i5-1145G7', cpuShort: 'Core i5', cpuTier: 'i5', cpuGen: 11,
  ramGb: 8, ssdGb: 256, maxRamGb: 32, screenIn: 14, screenRes: 'Full HD', weightKg: 1.4, uses: ['study'], categories: ['business'], tags: [], art: { style: 'thinkpad', colour: 'black' },
  image: null, featured: false, newPrice: null, fromPrice: 30_000_00, fromGrade: 'excellent', grades: [{ grade: 'excellent', price: 30_000_00, stock: 2 }],
  ramOn: [8], ssdOn: [256], unitsOnSale: 2, bestBattery: 90, inStock: true, sort: 1, createdAt: '', newestListing: null, popularity: 0, rating: null, ...o,
});
test('catalogue filters: brand, price, processor, generation, storage, availability', () => {
  const items = [card({ id: 'a' }), card({ id: 'b', brand: 'Apple', cpuTier: 'm1', cpuGen: null, fromPrice: 50_000_00, grades: [{ grade: 'excellent', price: 50_000_00, stock: 1 }], ssdOn: [512] }), card({ id: 'c', inStock: false, unitsOnSale: 0, grades: [{ grade: 'excellent', price: 30_000_00, stock: 0 }] })];
  assert.deepEqual(applyFilters(items, { ...EMPTY, brand: ['Apple'] }).map((p) => p.id), ['b']);
  assert.deepEqual(applyFilters(items, { ...EMPTY, max: 40_000 }).map((p) => p.id), ['a']);
  assert.deepEqual(applyFilters(items, { ...EMPTY, cpu: ['apple'] }).map((p) => p.id), ['b']);
  assert.deepEqual(applyFilters(items, { ...EMPTY, gen: ['11'] }).map((p) => p.id), ['a']);
  assert.deepEqual(applyFilters(items, { ...EMPTY, ssd: [512] }).map((p) => p.id), ['b']);
  assert.equal(applyFilters(items, { ...EMPTY, soldOut: true }).length, 3);
});
test('filters survive a round trip through the URL', () => {
  const f = parseFilters({ brand: 'Lenovo,Dell', gen: '11,12', ram: '16', grade: 'pristine', sort: 'price-asc', soldout: '1' });
  assert.equal(toQuery(f), '?brand=Lenovo%2CDell&gen=11%2C12&ram=16&grade=pristine&soldout=1&sort=price-asc');
});
test('models are sorted into categories from their specs', () => {
  const r = classify({ brand: 'Lenovo', weightKg: 1.13, uses: ['code', 'study'], ramGb: 16, cpuGen: 11, screenRes: 'WUXGA 1920×1200', ports: ['2× USB-C / Thunderbolt'], highlights: ['Backlit keyboard'], touch: false });
  assert.ok(r.categories.includes('ultralight') && r.categories.includes('developers') && r.categories.includes('business'));
  assert.ok(r.tags.includes('thunderbolt') && r.tags.includes('16:10'));
});

/* ── Content safety ─────────────────────────────────────────── */
test('editable pages cannot inject scripts or unsafe links', () => {
  const html = renderToStaticMarkup(Markdown({ text: '## Hi\n\n<script>alert(1)</script> [x](javascript:alert(1)) [ok](/warranty) **bold**' }));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(html.includes('href="/warranty"'));
  assert.ok(html.includes('<strong>bold</strong>'));
});

Promise.all(pending).then(() => console.log(`\n${passed} passed${process.exitCode ? ', some failed' : ''}`));
