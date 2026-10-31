# Build checklist

Status of every part of the brief. **Done** means built and exercised (unit tests, the 26-step browser test, or a manual run in demo mode). **Built, untested live** means the code exists but can't be proven until you add the account keys. **Blocked on you** needs a decision or an account only you can provide.

## Done

**Catalogue and storefront**
- [x] LappyClub brand: logo, favicon, share images and emails
- [x] Apple-style design in black, white and orange (Inter), background-free hero photos, scroll effects and page transitions; green theme removed everywhere
- [x] Book for ₹299 (amount and on/off in Admin → Settings), video call before dispatch (admin panel + customer request link), serial number to match on delivery, balance collected on delivery
- [x] Official manufacturer photo for all 39 models (Dell, HP, Lenovo PSREF, Apple), cleaned and stored in the repo
- [x] Home page: navigation, logo, search, hero with a real unit's report, brands, featured, popular (real data only), latest arrivals, deals, budgets, processors, grades, inspection, warranty, why refurbished, testimonials (shown only when ≥3 approved reviews exist), students, FAQ, newsletter, footer
- [x] Catalogue with brand, price, grade, processor, generation, memory, storage, screen, use and availability filters; 7 sorts; URL-shareable; mobile filter sheet
- [x] Brand, category and deals pages
- [x] Product page with unit-level choice (no generic condition claims), upgrades, warranty, quantity limited to units, EMI, PIN check, share, wishlist, compare, specs, reviews, similar/related/recently viewed
- [x] Public inspection report per unit
- [x] Search (⌘K / "/")

**Accounts**
- [x] One-time codes by SMS or email (rate-limited, hashed)
- [x] Password accounts (scrypt), registration, email verification, forgot/reset password
- [x] Phone and email changes verified by code/link
- [x] Sessions with sign-out of other devices; accounts can be switched off by staff
- [x] Guest checkout; guest orders appear in the account once the same email/phone is confirmed

**Cart, checkout, payments**
- [x] Cart in the database (guest cookie, merged on sign-in)
- [x] Units reserved at order time inside a transaction (two buyers can't get the same unit); released after 30 minutes unpaid
- [x] Server recomputes every price; student discount vs coupon (bigger wins); coupon rules (first order, per customer, brands, models, dates, limits)
- [x] Delivery fee, free-above threshold, COD on/off/fee/limit and blocked PIN codes from settings
- [x] GST breakdown (CGST+SGST or IGST, or margin scheme) on checkout and invoices
- [x] Razorpay order + signature check + webhook (idempotent) + late payments (revive or auto-refund) + reconciliation
- [x] Payments and refunds tables; partial and full refunds; manual refunds for COD
- [x] Demo payment window when no keys (never in production unless DEMO_MODE=1)

**Orders and after-sales**
- [x] 8-step tracker; shipment records with event history
- [x] Customer cancellation before packing with automatic refund
- [x] Returns, replacements, warranty claims and complaints with photos; staff workflow with emailed updates
- [x] Warranties created on delivery, tied to the serial; voided on return
- [x] Verified-purchase reviews with moderation and public replies
- [x] Support tickets (contact form and account), staff replies by email, internal notes

**Admin**
- [x] Roles: super admin, inventory manager, order manager, support; every action permission-checked and audit-logged
- [x] Analytics from real data with date ranges (revenue, orders, AOV, margin on costed units only, views→orders, refunds, GST, brands, best sellers, inventory, ageing)
- [x] Inventory units: intake, inspections, parts, status lifecycle, price override, location, cost, history
- [x] Models, brands, categories, coupons, customers, staff, students, reviews, tickets, returns
- [x] Editable policy pages (with "reviewed by a lawyer" flag) and blog
- [x] Notification templates (email, SMS, WhatsApp) with log and test sends
- [x] Newsletter list with CSV export and signed unsubscribe links
- [x] Settings (business, shipping, GST) and audit log
- [x] Packing slip and address label

**SEO and platform**
- [x] Product, AggregateOffer, AggregateRating (only with real reviews), BreadcrumbList, ItemList, FAQPage, Article JSON-LD
- [x] Sitemap (pages, brands, categories, models with images, posts), robots, canonical URLs, share images per model
- [x] Security headers, http-only cookies, hashed tokens, private file storage, Markdown rendered without raw HTML
- [x] Health check `/api/health`
- [x] 25 unit tests, 26-step browser test (including booking and the video call), clean production build

## Built, untested live (needs your keys)
- [ ] Razorpay live payments, refunds and webhooks (tested with signatures and in demo mode only)
- [ ] Resend email delivery (emails currently go to the server log)
- [ ] MSG91 sign-in SMS and order-update SMS (needs DLT templates)
- [ ] WhatsApp template messages
- [ ] Shiprocket serviceability, shipment booking, labels and tracking webhook
- [ ] Supabase Storage for ID photos, return photos and admin-uploaded laptop photos (local disk is used without it)

## Pending (not built)
- [ ] Social sign-in (Google). Optional in the brief; needs a Google OAuth client
- [ ] Customer data export/deletion self-service (handled by request through Support for now)
- [ ] Back-in-stock emails are collected (newsletter source `restock:<model>`) but not sent automatically
- [ ] Invoice numbering separate from order numbers (if your accountant wants a sequential series)
- [ ] Blog posts: none written yet

## Blocked on you
Values marked `[CONFIRM]` in code or settings.

| Decision | Where |
|---|---|
| Domain (name is LappyClub) | `NEXT_PUBLIC_SITE_URL`; the name lives in `BRAND` in `src/lib/config.ts` |
| Registered business name, GSTIN, CIN, addresses | Admin → Settings → Business |
| Grievance officer name | Admin → Settings → Business (required by the E-Commerce Rules) |
| GST scheme for refurbished laptops (regular 18% or margin) | Admin → Settings → GST (ask your accountant) |
| Every grade price and the "price when new" figures | Admin → Laptop models |
| Real stock: receive units with serials, costs and inspections | Admin → Inventory units (demo units disappear when `DEMO_MODE` is off on a fresh database) |
| Warranty (12 months), extension (24 months for ₹2,499), returns (10 days), dispatch (1–2 days) | `POLICY` in `src/lib/config.ts` |
| Booking amount (₹299) and that it is refunded in full if cancelled before dispatch; add the booking clause to your Terms if your database was created before this change | Admin → Settings → Shipping; Admin → Pages and blog → Terms |
| Grade battery minimums, the 32 checks, "NIST 800-88" wiping claim | `GRADES`, `CHECKS` in `src/lib/config.ts` |
| Delivery fee, COD limit and fee | Admin → Settings → Shipping |
| Student discount rules | `STUDENT` in `src/lib/config.ts` |
| Lawyer review of terms, privacy, returns, warranty, shipping | Admin → Pages and blog (tick "reviewed" after) |
| Contact phone, WhatsApp, email (currently IT Rentals') | Admin → Settings → Business |
| Accounts and keys | See `DEPLOYMENT.md` |
