# Refurbished laptop store (working name "Encore")

An online store for certified refurbished laptops, run alongside IT Rentals. Customers browse, pick a grade and upgrades, sign in with a one-time code on their mobile or email, pay through Razorpay (or on delivery), and follow their order to the door. Students verify once and get 10% off for a year. Staff run everything from `/admin`.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, Motion, Drizzle ORM and PostgreSQL. It lives in `store/` and is separate from the rental site at the repository root.

---

## What's in it

| Area | URL | What it does |
|---|---|---|
| Home | `/` | A test line sweeps a laptop's screen while its condition tag fills in; laptop finder (use and budget, live results); brand tiles; grade explainer with an annotated lid; the checks, ticking as you scroll; savings against new prices; student and business bands; FAQ |
| Catalogue | `/laptops` | Filters for brand, budget, processor, memory, screen and grade, plus use-case chips; sorting; filters kept in the URL so links can be shared; animated reflow; mobile filter sheet |
| Product | `/laptops/<model>` | Grade cards (price, stock, battery minimum), memory/storage upgrades, a WhatsApp link asking for photos of the unit, warranty extension, live price, student price, EMI plans, delivery estimate by PIN code, condition report tag, lid view per grade, specs, similar laptops, sticky buy bar on phones, Product structured data |
| Search | Ctrl/⌘ K or `/` | Instant search across models, processors, memory and "under 30000" style budgets |
| Compare | `/compare` | Pick up to three laptops from any card or product page; a tray collects them; the table marks the best price, memory, weight and year |
| Link previews | automatic | Every laptop has a generated share image (model, price, savings, condition tag) for WhatsApp, X and LinkedIn; the site has its own |
| Cart | drawer | Kept in the browser; quantities limited to stock |
| Sign in | `/login` | 6-digit code by SMS (MSG91) or email (Resend); no passwords; rate-limited, hashed, 5 tries |
| Checkout | `/checkout` | Sign in inline, saved addresses, PIN code auto-fill, GSTIN, coupon, student discount, pay online (Razorpay) or on delivery; server recomputes every price |
| Orders | `/orders/<number>` | Progress timeline, tracking, items, totals, retry payment, printable invoice |
| Account | `/account` | Orders, student status, profile, saved addresses |
| Students | `/students` | Verify by college email code (instant for .ac.in, .edu.in, .edu) or ID photo (checked by staff); status; picks with student prices |
| Admin | `/admin` | Overview, orders (pack, ship with tracking, deliver, cancel, refund through Razorpay), an email to you for every new order, student ID queue (approve or reject with reason, emails sent), prices and stock per grade, add or edit a laptop with photos, coupons, contact messages |
| Help and policy | `/how-we-test`, `/warranty`, `/returns`, `/shipping`, `/terms`, `/privacy`, `/contact`, `/about`, `/faq` | The pages Razorpay checks before activating live payments |

### How money and stock are handled

- Prices are stored in paise. The browser shows prices, but checkout and payment use only what the server calculates from the database.
- Stock is reserved when an order is placed. Online orders not paid within 30 minutes are cancelled and the stock goes back.
- Razorpay: the server creates a Razorpay order for the exact total, verifies the payment signature, and a webhook confirms payments even if the customer closes the tab. Each webhook event is processed once.
- The student discount goes on the most expensive laptop (one per order by default). A coupon and the student discount don't stack: the customer gets whichever saves more.

### Privacy and security

- Login codes are stored as a keyed hash, expire in 10 minutes and allow 5 tries. One code per 30 seconds and 5 per hour per number or email; 30 per hour per network.
- Sessions are random tokens in an http-only cookie; only their hash is stored.
- Student ID photos are re-encoded (location and other metadata removed), stored privately, shown only to admins, and deleted 30 days after the decision.
- Every server action checks who is calling; admin actions require an admin.

---

## Try it locally

```bash
cd store
npm install
npm run dev        # http://localhost:3100
```

No accounts or keys are needed. Without them the store runs in **demo mode**: the database is created on your computer (in `~/.refurb-store`), sign-in codes are shown on screen, and payments open a stand-in window where you choose success or failure. A banner at the top says so.

To open `/admin` locally, put `ADMIN_EMAILS=you@example.com` in `store/.env.local`, restart, and sign in with that email.

Other commands: `npm run build`, `npm run typecheck`, `npm run test:unit` (price rules, coupons, EMI, Razorpay signatures, sign-in parsing), `npm run test:e2e` (a browser run through a purchase, a student verification and the admin; needs Playwright and the dev server running), `npm run db:generate` (after changing `src/lib/db/schema.ts`), `npm run db:setup` (migrate and seed the database in `DATABASE_URL`).

---

## Going live: what you need to set up

Every setting is listed in `store/.env.example`. In order:

1. **Supabase** (database and ID photo storage). Create a project in the Mumbai region. Copy the *Transaction pooler* connection string into `DATABASE_URL`, and the project URL and *service role* key into `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Tables and the private `student-ids` bucket are created automatically on first start.
2. **Vercel** (hosting). Import this GitHub repository, set **Root Directory** to `store`, add the environment variables, deploy. Every push then gets its own preview link.
3. **Razorpay**. Sign up; test keys (`rzp_test_…`) work immediately. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, then create a webhook to `https://<your domain>/api/razorpay/webhook` with events `payment.captured`, `payment.failed`, `refund.processed`, and put its secret in `RAZORPAY_WEBHOOK_SECRET`. For live mode, Razorpay checks your business documents and the website's contact, terms, refund, shipping and privacy pages (all built).
4. **Resend** (emails: codes, order confirmations, shipping, student decisions). Add `RESEND_API_KEY`, verify your domain in Resend, and set `EMAIL_FROM`.
5. **MSG91** (SMS codes). Indian SMS needs DLT registration of your sender ID and an OTP template; that takes a few days. Then set `MSG91_AUTH_KEY` and `MSG91_OTP_TEMPLATE_ID`. Until then, leave phone sign-in off by not setting them: customers sign in with email, and phone sign-in shows a clear message.
6. Set `AUTH_SECRET` (a long random string), `NEXT_PUBLIC_SITE_URL`, and `ADMIN_EMAILS` / `ADMIN_PHONES`. Leave `DEMO_MODE` empty in production (set it to `1` for a public demo deployment without keys).

---

## Morning checklist: decisions only you can make

Everything below is a working default chosen during the build, marked `[CONFIRM]` in the code. Most live in `src/lib/config.ts`.

**Brand and business**
- [ ] **Name**: `BRAND.name` (currently "Encore"). The logo, emails, order numbers (first two letters) and page titles all follow it.
- [ ] **Domain**: `NEXT_PUBLIC_SITE_URL`.
- [ ] **Contact details**: phone, WhatsApp and email are IT Rentals' for now (`CONTACT`).
- [ ] **Legal entity, GSTIN and grievance officer** for invoices, terms and privacy (`LEGAL`). The Consumer Protection (E-Commerce) Rules require a named grievance officer.
- [ ] **GST on refurbished laptops**: regular 18% or the margin scheme. The invoice currently shows prices inclusive of GST without a split; ask your accountant.

**Prices and stock** (in `/admin/products` once live, or `src/lib/catalogue.ts` before the first start)
- [ ] **Every price** is a placeholder worked out from processor generation and model line.
- [ ] **Stock counts** are placeholders.
- [ ] **"Price when new"** figures (used for "you save X%") are approximate; Apple's are launch prices.
- [ ] **Which models to list**: 39 are seeded (Dell Latitude, HP EliteBook and ProBook, Lenovo ThinkPad, MacBook Air and Pro).
- [ ] **Upgrade prices**: memory +₹2,500 (16 GB) / +₹6,500 (32 GB); SSD +₹2,000 (512 GB) / +₹5,500 (1 TB).
- [ ] **Photos**: laptops are drawn illustrations until you upload photos in `/admin/products/<model>` (first photo leads; up to 8).

**Promises**
- [ ] Warranty: **12 months** included; extension to **2 years for ₹2,499**.
- [ ] Returns: **10 days** after delivery, free pickup.
- [ ] Dispatch: **1–2 working days**; transit times by region in `src/lib/delivery.ts`.
- [ ] Pay on delivery: **on, no fee, up to ₹60,000**.
- [ ] EMI estimate shown at **15% a year**, 3/6/9/12 months (no-cost EMI would need Razorpay's subvention setup).
- [ ] Grade battery minimums: **Pristine 85%, Excellent 80%, Good 75%**; SSD health **90%** for all.
- [ ] The **32 checks** list (`CHECKS`), and "data wiped to NIST 800-88".
- [ ] Warranty covers the battery if health falls below **50%**.

**Student discount**
- [ ] **10%**, no cap per laptop (`maxDiscountPerUnit`), **1 discounted laptop per order**, valid **12 months**.
- [ ] Auto-approved email endings: .ac.in, .edu.in, .edu, .ernet.in, .res.in, .ac.uk, .edu.au. Add colleges on other domains to `extraDomains`.
- [ ] ID photos deleted **30 days** after the decision.

---

## Where things are

| What | File |
|---|---|
| Business settings and promises | `src/lib/config.ts` |
| Starting catalogue and placeholder prices | `src/lib/catalogue.ts` |
| Database tables | `src/lib/db/schema.ts` (migrations in `drizzle/`) |
| Price rules (grades, upgrades, student, coupons, EMI) | `src/lib/pricing.ts` |
| Orders, stock, payment status, order emails | `src/lib/orders.ts` |
| Sign-in codes and sessions | `src/lib/auth/` |
| Razorpay, email, SMS, file storage | `src/lib/providers/` |
| Design tokens (colours, type, the tag) | `src/app/globals.css` |
| Drawn laptops and lids | `src/components/LaptopArt.tsx`, `src/components/LidMarks.tsx` |

## Design

- **Idea:** the condition tag. Every laptop carries a yellow tag with its grade and minimum battery and SSD health, the way refurbishers label units on the bench. It's the price tag on catalogue cards, the condition report on product pages, and the hero's moment on the home page.
- **Colour:** bench `#ECEFEA` (page), spruce `#0F3D33` (ink and dark bands), tag yellow `#F5C84C` (the one accent), pass green `#237A52` (health and success only).
- **Type:** Bricolage Grotesque for headings and prices (prices use its narrower width), Instrument Sans for text. Both self-hosted.
- **Motion:** one orchestrated moment (the hero scan), checks that tick as they scroll into view, and motion that answers actions (grade changes, filters reflowing, cart, price counting). Reduced-motion settings are respected.
- Checked with axe (WCAG 2.2 AA and best practice) on every public page at 1440 px and 390 px.
