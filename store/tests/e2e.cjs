/**
 * End-to-end check of the whole store in demo mode.
 *
 *   1. npm run dev                      (with ADMIN_EMAILS=admin@example.com in .env.local)
 *   2. node tests/e2e.cjs               (needs Playwright: npm i -D playwright && npx playwright install chromium)
 *
 * Walks through: browse and filter → product → cart → checkout with email sign-in →
 * simulated payment → order page; student ID upload; admin approves the student and
 * ships the order; the customer sees tracking and the student price. Prints one line per step.
 * BASE_URL overrides http://localhost:3100.
 */
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const run = Date.now().toString().slice(-6);
const results = [];
const step = async (name, fn) => {
  const t = Date.now();
  try { await fn(); results.push(['ok', name, Date.now() - t]); console.log(`ok    ${name}`); }
  catch (e) { results.push(['FAIL', name]); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`); throw e; }
};

async function signIn(page, dest, name = 'Test Person') {
  await page.fill('#dest', dest);
  await page.click('button:has-text("Send code")');
  await page.click('button:has-text("Use it")', { timeout: 15000 });
  // first sign-in on the login page asks for a name; inline sign-ins skip it
  const asked = await page.waitForSelector('#name', { timeout: 2500 }).catch(() => null);
  if (asked) { await page.fill('#name', name); await page.click('button:has-text("Continue")'); }
}

async function sampleIdImage() {
  // a tiny valid PNG (1×1) is enough for the upload path; the server re-encodes it
  const file = path.join(os.tmpdir(), `id-${run}.png`);
  fs.writeFileSync(file, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  return file;
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = (opts = {}) => browser.newContext({ viewport: { width: 1280, height: 860 }, ...opts });
  let orderNumber = '';
  try {
    const buyer = await (await ctx()).newPage();
    buyer.on('pageerror', (e) => errors.push(String(e)));

    await step('home page loads with the condition tag', async () => {
      await buyer.goto(BASE + '/', { waitUntil: 'networkidle' });
      await buyer.waitForSelector('text=Condition report');
    });
    await step('catalogue filters by brand', async () => {
      await buyer.goto(BASE + '/laptops', { waitUntil: 'networkidle' });
      await buyer.click('button.chip:has-text("Lenovo")');
      await buyer.waitForFunction(() => location.search.includes('brand=Lenovo'));
      // cards that no longer match animate out first
      await buyer.waitForFunction(() => {
        const t = [...document.querySelectorAll('article h3')].map((h) => h.textContent ?? '');
        return t.length > 0 && t.every((x) => x.includes('ThinkPad'));
      }, null, { timeout: 5000 });
    });
    await step('product page: choose 16 GB and add to cart', async () => {
      await buyer.goto(BASE + '/laptops/lenovo-thinkpad-t14-gen-2', { waitUntil: 'networkidle' });
      await buyer.click('label:has-text("16 GB")');
      await buyer.click('button:has-text("Add to cart")');
      await buyer.waitForSelector('[aria-label="Your cart"] >> text=16 GB memory');
    });
    await step('checkout: sign in by email inside checkout', async () => {
      await buyer.click('[aria-label="Your cart"] >> text=Check out');
      await buyer.waitForSelector('#dest');
      await signIn(buyer, `buyer${run}@example.com`);
      await buyer.waitForSelector('#a-name', { timeout: 20000 });
    });
    await step('checkout: address and simulated UPI payment', async () => {
      await buyer.fill('#a-name', 'Test Buyer');
      await buyer.fill('#a-phone', '9876500000');
      await buyer.fill('#a-pin', '122018');
      await buyer.fill('#a-city', 'Gurugram');
      await buyer.fill('#a-l1', 'Tower B3, Spaze iTech Park');
      await buyer.selectOption('#a-state', 'Haryana');
      await buyer.click('aside button:has-text("Pay")');
      await buyer.click('button:has-text("Pay with UPI")', { timeout: 20000 });
      await buyer.waitForURL('**/orders/**', { timeout: 20000 });
      orderNumber = new URL(buyer.url()).pathname.split('/').pop();
      await buyer.waitForSelector('text=Confirmed');
    });

    const student = await (await ctx()).newPage();
    await step('student uploads an ID photo', async () => {
      await student.goto(BASE + '/students', { waitUntil: 'networkidle' });
      await signIn(student, `9${run}0011`.slice(0, 10));
      await student.click('role=tab[name=/Student ID photo/]', { timeout: 20000 });
      await student.fill('#i-name', `Test Student ${run}`);
      await student.fill('#i-college', 'Test College of Engineering');
      await student.setInputFiles('#id-front', await sampleIdImage());
      await student.check('input[name=consent]');
      await student.click('button:has-text("Send for checking")');
      await student.waitForSelector('text=we’ve got your ID', { timeout: 20000 });
    });

    const admin = await (await ctx()).newPage();
    await step('admin signs in', async () => {
      await admin.goto(BASE + '/login?next=/admin', { waitUntil: 'networkidle' });
      await signIn(admin, 'admin@example.com');
      await admin.waitForURL((u) => u.pathname === '/admin', { timeout: 20000 });
    });
    await step('admin approves the student', async () => {
      await admin.goto(BASE + '/admin/students', { waitUntil: 'networkidle' });
      const card = admin.locator('li', { hasText: `Test Student ${run}` }).first();
      await card.locator('button:has-text("Approve")').click();
      await admin.waitForSelector('text=Approved and emailed');
    });
    await step('admin packs and ships the order with tracking', async () => {
      await admin.goto(`${BASE}/admin/orders/${orderNumber}`, { waitUntil: 'networkidle' });
      await admin.click('button:has-text("Mark packed")');
      await admin.waitForSelector('button:has-text("Mark shipped")');
      await admin.fill('#c', 'Delhivery');
      await admin.fill('#t', `DLV${run}`);
      await admin.click('button:has-text("Mark shipped")');
      await admin.waitForSelector('button:has-text("Mark delivered")');
    });
    await step('customer sees the tracking number', async () => {
      await buyer.goto(`${BASE}/orders/${orderNumber}`, { waitUntil: 'networkidle' });
      await buyer.waitForSelector(`text=DLV${run}`);
    });
    await step('approved student sees the student price', async () => {
      await student.goto(BASE + '/laptops/dell-latitude-5420', { waitUntil: 'networkidle' });
      await student.waitForSelector('text=Your student price');
    });
    await step('no script errors in the browser', async () => {
      if (errors.length) throw new Error(errors.join(' | '));
    });
  } catch {
    process.exitCode = 1;
  } finally {
    await browser.close();
    const failed = results.filter((r) => r[0] === 'FAIL').length;
    console.log(`\n${results.length - failed} passed, ${failed} failed${orderNumber ? `, order ${orderNumber}` : ''}`);
  }
})();
