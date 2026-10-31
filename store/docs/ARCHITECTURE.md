# Architecture

## Stack
Next.js 16 App Router (server components and server actions), React 19, Tailwind CSS 4, Motion, Drizzle ORM on PostgreSQL (Supabase or Neon in production; PGlite, an in-process Postgres, for local development), Zod for input validation. No client-side state is trusted: prices, stock and permissions are decided on the server.

## Layout
```
store/
  drizzle/                 SQL migrations (applied automatically at start, under an advisory lock)
  public/products/         official model photos + manifest.json (written by the photo Action)
  scripts/                 photo sources and downloader
  src/app/
    (store)/               storefront: its layout adds the header, cart drawer and footer
    admin/                 staff app with its own shell; every page calls requireStaff(permission)
    api/                   razorpay/webhook, shipping/webhook, health, admin file streams, catalogue JSON
  src/lib/                 all business logic (no UI); see below
  src/components/          UI; admin/ for staff widgets
  tests/                   unit.ts (tsx) and e2e.cjs (Playwright)
```

## Data model (src/lib/db/schema.ts)
- **products** (a model, e.g. ThinkPad T14 Gen 2) → **variants** (list price per grade) → **inventory_units** (each physical laptop: serial, grade, measured battery/SSD, cosmetic notes, cost, location, status) → **inspections**, **unit_parts**, **unit_events**.
- **carts / cart_items** point at units. **orders / order_items** snapshot the unit (code, serial, battery) and prices. **payments**, **refunds**, **shipments** (with event history), **coupon_redemptions**, **warranties** (created at delivery).
- **service_requests / service_events** (returns, replacements, warranty, complaints), **reviews**, **tickets / ticket_messages**.
- **users** (role, password hash, verified email/phone), **sessions**, **otps** (also used for rate-limit counters), **auth_tokens** (email links).
- **notification_templates / notifications**, **audit_logs**, **pages** (policies), **posts** (blog), **subscribers**, **settings**, **brands**, **categories**, **wishlists**, **recent_views**, **product_views**.

## How the important flows work
- **Stock.** A unit is on sale only when its status is `available`, which staff can set only after a passed inspection with measured battery health above the grade minimum and a price. `createOrder` reserves the chosen units with `UPDATE … WHERE status='available'` inside the order transaction, so two buyers can never get the same unit. Payment (or COD acceptance) turns `reserved` into `sold`; cancellation before dispatch returns them to `available`; a return makes them `returned` (re-inspect before selling).
- **Prices.** `lib/pricing.ts` is shared by browser and server, but the server recomputes everything in `quote()`/`createOrder()` from the database. Student discount and coupons don't stack; the larger wins.
- **Payments.** Razorpay order → Checkout → signature verified server-side → `markPaid`. The webhook does the same if the tab closes (deduplicated by event id). Late payments on cancelled orders revive the order if the unit is still free, otherwise refund automatically. Refunds go through Razorpay or are recorded as manual for COD.
- **Access.** `getViewer()` reads the session cookie (only its SHA-256 is stored). `rbac.ts` maps roles to permissions; staff pages call `requireStaff(p)` and server actions call `staffCan(p)`. Guests open their orders with an HMAC key in the link; signed-in customers also see guest orders placed with their verified email or phone.
- **Messages.** `notify(key, recipients, vars)` loads the staff-edited template (or the default from `templates.ts`), sends by email/SMS/WhatsApp where configured, and logs every attempt. Failures never break an order.
- **Content.** Policy pages are Markdown in the `pages` table with `{{placeholders}}` filled from settings; rendered by a small renderer that builds React elements (no raw HTML), so stored text can't inject scripts.
- **Settings.** `getSettings()` merges database rows over defaults from `config.ts`, cached 30 s.

## Security notes
- Secrets are server-only environment variables; nothing sensitive is prefixed `NEXT_PUBLIC_`.
- Card data never touches the server (Razorpay Checkout).
- Sign-in codes are HMAC-hashed, expire in 10 minutes, allow 5 tries, and are rate-limited per destination and per network; password failures are rate-limited too.
- Passwords use scrypt with per-password salts; resets end every session.
- Student IDs and return photos are stored privately and streamed only to permitted staff; ID photos are deleted 30 days after a decision.
- Every server action validates input with Zod and checks permissions; staff actions are audit-logged.
- Security headers are set in `next.config.ts`.
