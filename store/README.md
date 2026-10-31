# LappyClub: certified pre-owned laptop store

An online store for certified refurbished laptops, run alongside IT Rentals. Every laptop on sale is a **specific, inspected unit** with its own grade, measured battery and SSD health, cosmetic notes and public inspection report, so what the customer chooses is what ships.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, Motion, Drizzle ORM and PostgreSQL. It lives in `store/` and is separate from the rental site at the repository root.

More detail:
- [`docs/CHECKLIST.md`](docs/CHECKLIST.md): what is done, what is pending and what is blocked on you
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): how the code is organised and how money, stock and data flow
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): step-by-step go-live on Supabase + Vercel with Razorpay, Resend, MSG91, WhatsApp and Shiprocket

---

## What's in it

**Storefront**
| Area | URL | What it does |
|---|---|---|
| Home | `/` | Hero with a real unit's inspection report, brands, featured, popular (from real views and sales), latest arrivals, deals, budgets, processors, grades, inspection process, warranty, why refurbished, verified reviews (only when real ones exist), students, FAQ, newsletter |
| Catalogue | `/laptops`, `/brands/<brand>`, `/category/<slug>`, `/deals` | Filters for brand, price, condition, processor, generation, memory, storage, screen, use and availability; sorts by recommended, popularity, price, newest arrivals, newest models, biggest saving; all kept in the URL |
| Product | `/laptops/<model>` | Official manufacturer photos; grade tabs; **choose the exact unit** (battery %, cycles, SSD %, cosmetic notes, report link); memory/storage upgrades; warranty extension; quantity up to the units available; EMI table; PIN code delivery check; share; wishlist; compare; specs; verified reviews; similar, more from the brand, recently viewed; Product JSON-LD (rating only when real reviews exist) |
| Unit report | `/units/<code>` | Every check with its result, measured values, parts replaced, inspector and date |
| Cart | drawer and `/cart` | Stored in the database (guests by cookie, merged on sign-in); edit configuration per unit; sold units flagged |
| Checkout | `/checkout` | Guest or signed in; saved addresses; PIN auto-fill; GSTIN; coupons; student discount; delivery and COD fees from settings; GST shown; book with ₹299 (balance on delivery), Razorpay in full, or pay on delivery; terms consent |
| Order | `/orders/<number>` | 8-step tracker, shipment updates, payments and refunds, invoice with GST breakdown, cancel (auto-refund), returns/replacements/warranty/complaints with photos, reviews. Guests open it with a private link |
| Accounts | `/login`, `/register`, `/forgot`, `/reset/…`, `/verify-email/…`, `/track` | One-time code (SMS or email) or password; email confirmation; password reset; guest order lookup |
| Customer dashboard | `/account/…` | Overview, orders, returns and repairs, warranty, wishlist, recently viewed, addresses, support conversations, profile and security |
| Students | `/students` | College email (instant) or ID photo (checked by staff); 10% off for a year |
| Content | `/terms`, `/privacy`, `/returns`, `/warranty`, `/shipping`, `/grievance`, `/blog`, `/support`, `/business`, `/how-we-test`, `/faq`, `/about`, `/contact` | Policy pages are editable in admin; contact form opens a ticket |

**Admin** (`/admin`, permissions by role: super admin, inventory manager, order manager, support)
| Module | What it does |
|---|---|
| Overview | Work queue; KPIs, daily revenue chart, orders by status, revenue by brand, best sellers, inventory and ageing; date ranges; margin only for units with a recorded cost; go-live warnings |
| Orders | Filters and search; fulfilment steps with courier/AWB; Shiprocket booking when connected; partial or full refunds (Razorpay or manual); payment reconciliation; packing slip and label; history and audit trail |
| Inventory units | Receive units (serial, cost, source, location); inspections with all 32 checks; parts replaced; status lifecycle intake → inspection → refurbishing → available → reserved → sold, plus returned, RMA, hold, scrapped; price override; history |
| Laptop models | Grade prices, visibility, featured; full editor with photos, categories, tags, extra specs, SEO |
| Brands and categories | Each has its own store page |
| Coupons | Percent or fixed; minimum order; cap; total and per-customer limits; first order only; brand or model restrictions; start and end dates |
| Returns and warranty | Requests with photos; status flow; public or internal notes (emailed) |
| Customers, staff and roles | Search, history, switch accounts off; add staff and set roles |
| Support tickets, reviews, student IDs | Reply (emailed), internal notes; publish or hide reviews, public replies; approve or reject IDs |
| Pages and blog | Markdown editor with placeholders; "reviewed by a lawyer" flag per page |
| Notifications | Edit every email/SMS/WhatsApp template; test sends; delivery log |
| Newsletter, settings, audit log | CSV export; business details, shipping/COD, GST; every staff action and money movement |

---

## Try it locally

```bash
cd store
npm install
npm run dev        # http://localhost:3100
```

No accounts or keys are needed. Without them the store runs in **demo mode**: the database is created on your computer (in `~/.refurb-store`), sample units are created (serials start with `DEMO-`), sign-in codes are shown on screen, and payments open a stand-in window. A banner says so. To open `/admin`, put `ADMIN_EMAILS=you@example.com` in `store/.env.local`, restart, and sign in with that email.

| Command | What it does |
|---|---|
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run test:unit` | 25 checks: prices, upgrades, coupons, shipping, GST, signatures, passwords, roles, order flow, filters, Markdown safety |
| `npm run test:e2e` | 26 browser steps through a booked guest purchase with the video call, a member purchase, admin inventory and fulfilment, refunds, returns, reviews, tickets and student verification (needs the dev server and Playwright) |
| `npm run db:generate` | New migration after changing `src/lib/db/schema.ts` |
| `npm run db:setup` | Migrate and seed the database in `DATABASE_URL` |

Product photos are the manufacturers' official images, downloaded by the GitHub Action in `.github/workflows/store-product-images.yml` from the list in `scripts/product-image-sources.json` and committed to `public/products/`. Photos uploaded in admin replace them.

---

## Decisions only you can make

Everything marked `[CONFIRM]` in the code is a working default. The full list, with where to change each, is in [`docs/CHECKLIST.md`](docs/CHECKLIST.md#blocked-on-you). The most important: business name and domain, legal entity, GSTIN and grievance officer (Admin → Settings), GST scheme for refurbished goods, every price, the warranty and return promises, and a lawyer's review of the policy pages.

## Where things are

| What | File |
|---|---|
| Promises (warranty, returns, grades, checks, student rules) | `src/lib/config.ts` |
| Business settings with defaults (contact, shipping, COD, GST) | `src/lib/settings.ts` (edited in Admin → Settings) |
| Database tables | `src/lib/db/schema.ts` (migrations in `drizzle/`) |
| Units, inspections, status rules | `src/lib/inventory.ts` |
| Prices, discounts, shipping, EMI | `src/lib/pricing.ts`; GST in `src/lib/tax.ts` |
| Orders, payments, refunds, fulfilment, warranties | `src/lib/orders.ts` |
| Cart | `src/lib/cart.ts` |
| Roles and permissions | `src/lib/rbac.ts` |
| Message templates and sending | `src/lib/templates.ts`, `src/lib/notify.ts` |
| Razorpay, email, SMS, WhatsApp, storage | `src/lib/providers/` |
| Shiprocket | `src/lib/shipping.ts` |
| Design tokens | `src/app/globals.css` |

## Design

- **Idea:** Apple-style storefront in black, white and orange, with glass. A slim black navigation bar and a dark ribbon with the booking offer lead into a dark stage with slowly drifting orange glows: a short headline (business-grade laptops at low prices), then frosted-glass brand tiles (Dell Latitude, HP EliteBook, ThinkPad, MacBook Air, students) with big background-free laptop photos. The next scroll answers "why trust us?" in five glass steps: choose your model, book it for ₹299, have a look on video, match the serial number, then finalise. The page answers "why should I trust you?" with the booking flow: book for ₹299, see the exact unit on video, match the serial on delivery, then pay the balance.
- **Logo:** `src/components/Logo.tsx`: a black tile (white on dark backgrounds) with a bold "L" drawn as an open laptop and an orange camera dot; wordmark "lappy" plus "club" in orange. Favicon `src/app/icon.svg`.
- **Colour:** white and Apple grey `#F5F5F7`, black `#111111`, orange `#FF5A1F` for buttons, highlights and savings. Status colours only for states.
- **Type:** Inter throughout, Geist Mono for unit codes, serial numbers and measurements. Self-hosted.
- **Photos on black:** `scripts/make-cutouts.cjs` removes the white background from a few manufacturer photos (`public/products/<slug>/cutout.webp`) so they sit cleanly on dark sections. Run `node scripts/make-cutouts.cjs <slug>:1` for another model.
- **Motion** (`src/components/Scenes.tsx`, ported from the GC Venture site's scroll scenes): laptop photos grow into place as their tile scrolls up and lift on hover, a soft light follows the pointer across glass panels, glows drift behind the glass, the savings figure counts up, filled buttons get a light sweep on hover, sections and cards rise in turn, the steps line fills as you scroll, and every page enters with a soft rise. Nothing moves for visitors who ask for reduced motion, and everything is visible without JavaScript.

## Booking flow

1. Checkout offers **Book now for ₹299** (default), **Pay online in full** or **Pay on delivery**.
2. A booking order is paid online for the booking amount only. It shows as "Booked, balance on delivery"; the unit is sold to the customer.
3. Admin → Orders → the order shows a **Video call before dispatch** panel: open WhatsApp, show the laptop and its serial sticker, then press **Mark video call done** (logged in the order history and shown to the customer).
4. The customer's order page shows the serial number to match on delivery and the balance due. The packing label and Shiprocket collect only the balance.
5. Marking the order delivered records the balance as collected. Cancelling before dispatch refunds the booking amount automatically.
