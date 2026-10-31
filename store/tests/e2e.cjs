/**
 * End-to-end check of the whole store in demo mode.
 *
 *   1. npm run dev                      (with ADMIN_EMAILS=admin@example.com in .env.local)
 *   2. node tests/e2e.cjs               (needs Playwright: npm i -D playwright && npx playwright install chromium)
 *
 * Walks through, as real browsers:
 *   guest: browse, filter, pick a specific unit, cart, guest checkout, simulated payment, order page;
 *   member: create an account with a password, wishlist, pay on delivery, support ticket;
 *   student: ID upload; admin: approve the student, receive and inspect a new unit and list it,
 *   move the guest order through all fulfilment steps, issue a partial refund;
 *   after delivery: the guest requests a return, the member reviews, the admin publishes it.
 * Prints one line per step. BASE_URL overrides http://localhost:3100.
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

async function codeSignIn(page, dest, name = 'Test Person') {
  await page.fill('#dest', dest);
  await page.click('button:has-text("Send code")');
  await page.click('button:has-text("Use it")', { timeout: 15000 });
  const asked = await page.waitForSelector('#name', { timeout: 2500 }).catch(() => null);
  if (asked) { await page.fill('#name', name); await page.click('button:has-text("Continue")'); }
}

function sampleIdImage() {
  const file = path.join(os.tmpdir(), `id-${run}.png`);
  fs.writeFileSync(file, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  return file;
}

async function fillAddress(page, { name, phone, pin, city, line1, state }) {
  await page.fill('#a-name', name);
  await page.fill('#a-phone', phone);
  await page.fill('#a-pin', pin);
  await page.fill('#a-city', city);
  await page.fill('#a-line1', line1);
  await page.selectOption('#a-state', state);
}

/** Adds the first listed unit of a model to the cart; returns its unit code. */
async function addFirstUnit(page, slug) {
  await page.goto(`${BASE}/laptops/${slug}`, { waitUntil: 'networkidle' });
  const code = (await page.locator('input[name=unit]:checked >> xpath=..').locator('.mono').first().innerText()).replace('Unit ', '').trim();
  await page.locator('button:has-text("Add to cart")').first().click();
  await page.waitForFunction(() => /Cart, [1-9]/.test(document.querySelector('header button[aria-label^="Cart"]')?.getAttribute('aria-label') ?? ''), null, { timeout: 15000 });
  return code;
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = (opts = {}) => browser.newContext({ viewport: { width: 1360, height: 900 }, ...opts });
  let guestOrder = '';
  let guestUrl = '';
  let memberOrder = '';
  try {
    /* ── Guest ─────────────────────────────────────────────── */
    const guest = await (await ctx()).newPage();
    guest.on('pageerror', (e) => errors.push(`guest: ${e.message}`));

    await step('home page shows a real unit’s inspection report', async () => {
      await guest.goto(BASE + '/', { waitUntil: 'networkidle' });
      await guest.waitForSelector('text=Inspection report');
      await guest.waitForSelector('text=Our picks this week');
    });
    await step('catalogue: filter by brand and processor, kept in the URL', async () => {
      await guest.goto(BASE + '/laptops', { waitUntil: 'networkidle' });
      await guest.check('#brand-Lenovo');
      await guest.waitForFunction(() => location.search.includes('brand=Lenovo'));
      await guest.waitForFunction(() => [...document.querySelectorAll('article h3')].every((h) => (h.textContent ?? '').includes('ThinkPad')));
      await guest.selectOption('#sort', 'price-asc');
      await guest.waitForFunction(() => location.search.includes('sort=price-asc'));
    });
    let unitCode = '';
    await step('product page: choose a specific unit and add it to the cart', async () => {
      unitCode = await addFirstUnit(guest, 'lenovo-thinkpad-t14-gen-2');
      if (!/^U-/.test(unitCode)) throw new Error(`unexpected unit code ${unitCode}`);
    });
    await step('unit’s public inspection report opens', async () => {
      const p = await guest.context().newPage();
      await p.goto(`${BASE}/units/${unitCode}`, { waitUntil: 'networkidle' });
      await p.waitForSelector('text=Every check');
      await p.close();
    });
    await step('guest checkout with simulated UPI payment', async () => {
      await guest.goto(BASE + '/checkout', { waitUntil: 'networkidle' });
      await guest.fill('#email', `guest${run}@example.com`);
      await fillAddress(guest, { name: 'Guest Buyer', phone: `98${run}12`.slice(0, 10), pin: '560102', city: 'Bengaluru', line1: '12 Test Road, HSR Layout', state: 'Karnataka' });
      await guest.getByLabel(/I agree to the/).check();
      await guest.click('aside button:has-text("Pay")');
      await guest.click('button:has-text("Pay with UPI")', { timeout: 20000 });
      await guest.waitForURL('**/orders/**', { timeout: 20000 });
      guestUrl = guest.url().replace('&placed=1', '').replace('placed=1&', '');
      guestOrder = new URL(guest.url()).pathname.split('/').pop();
      await guest.waitForSelector('text=Payment confirmed');
    });
    await step('the sold unit is no longer offered', async () => {
      await guest.goto(`${BASE}/laptops/lenovo-thinkpad-t14-gen-2`, { waitUntil: 'networkidle' });
      if (await guest.locator(`text=Unit ${unitCode}`).count()) throw new Error('sold unit still listed');
    });

    /* ── Member ─────────────────────────────────────────────── */
    const member = await (await ctx()).newPage();
    member.on('pageerror', (e) => errors.push(`member: ${e.message}`));
    const memberEmail = `member${run}@example.com`;
    await step('create an account with a password', async () => {
      await member.goto(BASE + '/register', { waitUntil: 'networkidle' });
      await member.fill('#r-name', 'Member Tester');
      await member.fill('#r-email', memberEmail);
      await member.fill('#r-pw', 'blue kettle on the hill');
      await member.click('button:has-text("Create account")');
      await member.waitForURL('**/account**', { timeout: 20000 });
      await member.waitForSelector('text=Your account is ready');
    });
    await step('save a laptop to the wishlist', async () => {
      await member.goto(BASE + '/laptops/dell-latitude-5420', { waitUntil: 'networkidle' });
      await member.click('button:has-text("Save")');
      await member.waitForSelector('button[aria-pressed=true]:has-text("Saved")');
      await member.goto(BASE + '/account/wishlist', { waitUntil: 'networkidle' });
      await member.waitForSelector('text=Latitude 5420');
    });
    await step('member orders with pay on delivery', async () => {
      await addFirstUnit(member, 'dell-latitude-5420');
      await member.goto(BASE + '/checkout', { waitUntil: 'networkidle' });
      await fillAddress(member, { name: 'Member Tester', phone: `97${run}34`.slice(0, 10), pin: '122018', city: 'Gurugram', line1: 'Tower B3, Spaze iTech Park', state: 'Haryana' });
      await member.getByRole('radio', { name: /Pay on delivery/ }).check();
      await member.getByLabel(/I agree to the/).check();
      await member.click('aside button:has-text("Place order")');
      await member.waitForURL('**/orders/**', { timeout: 20000 });
      memberOrder = new URL(member.url()).pathname.split('/').pop();
      await member.waitForSelector('text=Pay on delivery');
    });
    await step('member opens a support ticket', async () => {
      await member.goto(BASE + '/account/support', { waitUntil: 'networkidle' });
      await member.fill('#t-sub', `Question ${run}`);
      await member.fill('#t-body', 'Does this laptop come with a charger? Thanks.');
      await member.click('button:has-text("Send")');
      await member.waitForURL('**/account/support/T-**', { timeout: 15000 });
    });

    /* ── Student ────────────────────────────────────────────── */
    const student = await (await ctx()).newPage();
    student.on('pageerror', (e) => errors.push(`student: ${e.message}`));
    await step('student uploads an ID photo', async () => {
      await student.goto(BASE + '/students', { waitUntil: 'networkidle' });
      await codeSignIn(student, `9${run}0011`.slice(0, 10));
      await student.click('role=tab[name=/Student ID photo/]', { timeout: 20000 });
      await student.fill('#i-name', `Test Student ${run}`);
      await student.fill('#i-college', 'Test College of Engineering');
      await student.setInputFiles('#id-front', sampleIdImage());
      await student.check('input[name=consent]');
      await student.click('button:has-text("Send for checking")');
      await student.waitForSelector('text=we’ve got your ID', { timeout: 20000 });
    });

    /* ── Admin ──────────────────────────────────────────────── */
    const admin = await (await ctx()).newPage();
    admin.on('pageerror', (e) => errors.push(`admin: ${e.message}`));
    await step('admin signs in to the dashboard', async () => {
      await admin.goto(BASE + '/login?next=/admin', { waitUntil: 'networkidle' });
      await codeSignIn(admin, 'admin@example.com', 'Store Admin');
      await admin.waitForURL((u) => u.pathname === '/admin', { timeout: 20000 });
      await admin.waitForSelector('text=To pack and ship');
    });
    await step('admin approves the student', async () => {
      await admin.goto(BASE + '/admin/students', { waitUntil: 'networkidle' });
      const card = admin.locator('li', { hasText: `Test Student ${run}` }).first();
      await card.locator('button:has-text("Approve")').click();
      await admin.waitForSelector('text=Approved and emailed');
    });
    let newUnit = '';
    await step('admin receives a new unit, inspects it and lists it', async () => {
      await admin.goto(BASE + '/admin/inventory/new?product=hp-elitebook-840-g8', { waitUntil: 'networkidle' });
      await admin.fill('#u-serialNumber', `E2E${run}`);
      await admin.fill('#u-batteryHealth', '93');
      await admin.fill('#u-cos', 'Test unit: one faint mark on the lid.');
      await admin.click('button:has-text("Add unit")');
      await admin.waitForURL('**/admin/inventory/U-**', { timeout: 20000 });
      newUnit = new URL(admin.url()).pathname.split('/').pop();
      await admin.fill('#in-b', '93');
      await admin.fill('#in-s', '98');
      await admin.click('button:has-text("Record inspection")');
      await admin.waitForSelector('text=Inspection passed');
      await admin.click('button.chip:has-text("List for sale")');
      await admin.locator('button.btn:has-text("List for sale")').click();
      await admin.waitForSelector('text=it’s now on sale');
    });
    await step('the new unit appears on its product page', async () => {
      await guest.goto(`${BASE}/laptops/hp-elitebook-840-g8`, { waitUntil: 'networkidle' });
      await guest.click('button:has-text("Show all")').catch(() => {});
      for (const g of ['Pristine', 'Excellent', 'Good']) {
        await guest.locator(`fieldset button:has-text("${g}")`).first().click();
        await guest.click('button:has-text("Show all")').catch(() => {});
        if (await guest.locator(`text=Unit ${newUnit}`).count()) return;
      }
      throw new Error(`unit ${newUnit} not listed`);
    });
    await step('admin moves the guest order through every fulfilment step', async () => {
      await admin.goto(`${BASE}/admin/orders/${guestOrder}`, { waitUntil: 'networkidle' });
      const move = async (label, fill) => {
        await admin.locator('button.chip', { hasText: label }).first().click();
        if (fill) await fill();
        await admin.locator('button.btn', { hasText: `Mark ${label.toLowerCase()}` }).click();
        await admin.waitForSelector(`text=Marked ${label.toLowerCase()}`, { timeout: 15000 });
      };
      await move('Final inspection');
      await move('Packed');
      await move('Shipped', async () => { await admin.fill('#oc-c', 'Delhivery'); await admin.fill('#oc-a', `DLV${run}`); });
      await move('In transit');
      await move('Out for delivery');
      await move('Delivered');
    });
    await step('admin issues a partial refund', async () => {
      await admin.fill('#rf-a', '500');
      await admin.fill('#rf-r', 'Goodwill for a delayed delivery (test)');
      admin.once('dialog', (d) => d.accept());
      await admin.click('button:has-text("Refund ₹500")');
      await admin.waitForSelector('text=Refund started');
    });

    /* ── After delivery ─────────────────────────────────────── */
    await step('guest sees delivery, warranty and the refund', async () => {
      await guest.goto(guestUrl, { waitUntil: 'networkidle' });
      await guest.waitForSelector(`text=DLV${run}`);
      await guest.waitForSelector('text=Warranty until');
      await guest.waitForSelector('text=Refund ₹500');
    });
    await step('guest requests a return from the order page', async () => {
      await guest.click('button.chip:has-text("Return for a refund")');
      await guest.selectOption('#sr-reason', 'Changed my mind');
      await guest.fill('#sr-details', 'Testing the return flow end to end.');
      await guest.click('button:has-text("Send request")');
      await guest.waitForSelector('text=Requested', { timeout: 15000 });
    });
    await step('admin sees and approves the return', async () => {
      await admin.goto(BASE + '/admin/returns', { waitUntil: 'networkidle' });
      await admin.locator('tr', { hasText: guestOrder }).locator('a').first().click();
      await admin.waitForSelector('text=Testing the return flow');
      await admin.selectOption('#rs', 'approved');
      await admin.fill('#rn', 'Pickup will be booked tomorrow.');
      await admin.click('button:has-text("Save update")');
      await admin.waitForSelector('text=The customer has been emailed');
    });
    await step('member’s order is delivered and they write a review', async () => {
      await admin.goto(`${BASE}/admin/orders/${memberOrder}`, { waitUntil: 'networkidle' });
      for (const label of ['Final inspection', 'Packed']) {
        await admin.locator('button.chip', { hasText: label }).first().click();
        await admin.locator('button.btn', { hasText: `Mark ${label.toLowerCase()}` }).click();
        await admin.waitForSelector(`text=Marked ${label.toLowerCase()}`);
      }
      await admin.locator('button.chip', { hasText: 'Shipped' }).first().click();
      await admin.fill('#oc-a', `BD${run}`);
      await admin.locator('button.btn', { hasText: 'Mark shipped' }).click();
      await admin.waitForSelector('text=Marked shipped');
      await admin.locator('button.chip', { hasText: 'Delivered' }).first().click();
      await admin.locator('button.btn', { hasText: 'Mark delivered' }).click();
      await admin.waitForSelector('text=Marked delivered');
      await member.goto(`${BASE}/orders/${memberOrder}#review`, { waitUntil: 'networkidle' });
      await member.click('button[aria-label="5 stars"]');
      await member.fill('#rv-b', `Arrived exactly as described, battery as listed. Test review ${run}.`);
      await member.click('button:has-text("Submit review")');
      await member.waitForSelector('text=Your review will appear');
    });
    await step('admin publishes the review and it shows on the product page', async () => {
      await admin.goto(BASE + '/admin/reviews', { waitUntil: 'networkidle' });
      await admin.locator('li', { hasText: `Test review ${run}` }).locator('button:has-text("Publish")').click();
      await admin.waitForSelector('text=Published.');
      await guest.goto(`${BASE}/laptops/dell-latitude-5420`, { waitUntil: 'networkidle' });
      await guest.waitForSelector(`text=Test review ${run}`);
    });
    await step('admin replies to the member’s ticket', async () => {
      await admin.goto(BASE + '/admin/tickets', { waitUntil: 'networkidle' });
      await admin.locator('tr', { hasText: `Question ${run}` }).locator('a').first().click();
      await admin.fill('textarea[name=body]', 'Yes, every laptop ships with a matching charger.');
      await admin.click('button:has-text("Send")');
      await admin.waitForSelector('text=Reply sent by email');
      await member.goto(BASE + '/account/support', { waitUntil: 'networkidle' });
      await member.locator('a', { hasText: `Question ${run}` }).click();
      await member.waitForSelector('text=matching charger');
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
    console.log(`\n${results.length - failed} passed, ${failed} failed${guestOrder ? `, orders ${guestOrder} ${memberOrder}` : ''}`);
  }
})();
