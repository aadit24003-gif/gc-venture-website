# itrentals.in, IT Rental Solutions website

A fast, static website for **IT Rental Solutions** (itrentals.in): laptop, desktop, MacBook, server, networking and phone rental for businesses across India.

Built with [Astro](https://astro.build). It outputs plain HTML/CSS/JS plus one small PHP file for forms, so it runs on the existing cPanel/GoDaddy-style hosting with no server changes.

---

## What's on the site

| Area | URL | Notes |
|---|---|---|
| Home | `/` | Scroll-driven: a laptop boots as Apple, HP, Dell and Lenovo, then as IT Rentals with the headline and quote buttons; client names; preparation checks that tick and a parcel that travels the delivery route as you scroll; an office video that opens to full screen; scale selector; popular models; equipment; why us; "How renting works" cards that stack as you scroll; industries; India map; FAQ |
| Service pages (8) | `/laptop-rental/`, `/macbook-rental/`, `/desktop-rental/`, `/monitor-rental/`, `/server-rental/`, `/router-rental/`, `/mobile-phone-rental/`, `/it-equipment-rental/` | Generated from `src/data/categories.ts` |
| Catalogue | `/equipment/` | Search, filters (category, brand, processor, generation, RAM, storage, screen, city), shareable filter URLs, compare up to 3 |
| Product pages (22) | `/equipment/<model>/` | Specs, rental terms, "Need 20 of these?" quote form, WhatsApp with product name |
| City pages (14) | `/laptop-on-rent-in-<city>/` | Unique intro, areas, industries and FAQs per city; office address only for Gurgaon and Bangalore |
| Company | `/about/`, `/industries/`, `/locations/`, `/contact/` | |
| Conversion | `/request-a-quote/`, `/support/` | Quote form (supports `?qty=`, `?product=`, `?category=`, `?city=`, `?type=enterprise`) and support/complaint form with attachment |
| Legal | `/privacy-policy/`, `/terms/` | Drafts with `[REQUIRES CONFIRMATION]` markers; `noindex` until finalised |

Main navigation: Home, About, Services (dropdown), Locations (dropdown), Contact Us, Raise a Complaint.

Mobile has a sticky **Call / WhatsApp / Get quote** bar; desktop has a floating WhatsApp button.

---

## Editing content (no design changes needed)

All business data lives in a few files. Change it there and every page, form, schema block and sitemap entry updates.

| What | File |
|---|---|
| Phone numbers, WhatsApp, emails, business hours, office addresses, service promises (deposit, lock-in, delivery, 24/7…), analytics ID | `src/config/site.ts` |
| Services and their copy, configurations, FAQs | `src/data/categories.ts` |
| Laptop list (brand, model, processor, standard RAM and storage), one row per model and processor | `src/data/laptop-catalogue.ts` |
| MacBook Air and MacBook Pro generations (2019 to M5) with their memory and storage options | `src/data/mac-lineup.ts` |
| Laptops, Macs, desktops, monitors (descriptions, availability, price, photos, upgrade rules) | `src/data/products.ts` |
| Cities (areas, intro, FAQs, office or service area) | `src/data/cities.ts` |
| Industries | `src/data/industries.ts` |
| Client names and logos, testimonials, case studies | `src/data/clients.ts` |
| Home/quote FAQs | `src/data/faqs.ts` |

Home page motion: the scroll scenes live in `src/scripts/scenes.ts` with the layouts in `Hero.astro`, `FilmScene.astro`, `StepsScene.astro` and `Preparation.astro`. Visitors who ask their device for reduced motion, or whose browser blocks scripts, get a static version of the same page.

Common tasks:

- **Turn a promise off** (e.g. if "zero deposit" changes): set `enabled: false` for it in `CLAIMS` in `site.ts`. It disappears everywhere, and FAQ answers adapt.
- **Add a laptop model:** add a row to `src/data/laptop-catalogue.ts`. Rows with the same brand and model become one product; each row's processor becomes an option in its configuration picker. Memory and storage upgrades are offered from the standard size upward (`ramOptions` / `storageOptions` in `products.ts`).
- **Add a product photo:** put the image in `public/products/` and add it to that product's `images` array with real `width`/`height` and alt text such as "Dell Latitude 7490 on rent".
- **Minimum order:** laptop rentals start at 10 units; this is stated on the laptop page, the scale selector and the quote form.
- **Show a price:** set `rental_price` (₹/month) on a product. Leave `null` for "Request a quote".
- **Mark stock:** `availability: 'in-stock' | 'limited' | 'on-request'`. Everything is `on-request` until stock is confirmed.
- **Add a client logo:** put a monochrome SVG/PNG in `public/clients/` and set `logo: '/clients/name.svg'`. Without a logo the name is typeset.
- **Add a testimonial:** add `{ quote, name, role, company }` to `TESTIMONIALS`. The section appears automatically once there is at least one.
- **Product pages with fewer than 3 known specs** (currently desktops and monitors) are `noindex` and left out of the sitemap until specs are added.

Form recipients are set **server-side** in `public/api/config.php`. Keep them in sync with `site.ts`.

---

## Run it locally

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs the site to dist/
```

To test forms locally: `cd dist && php -S 127.0.0.1:8099` (add `127.0.0.1` to `allowed_hosts` in `dist/api/config.php`).

---

## Deploying to the current hosting (cPanel)

Step-by-step version for non-developers: see `LAUNCH-GUIDE.md`.

1. **Back up the current WordPress site** (cPanel → Backup, or download `public_html` and export the database). Keep it until the new site has run cleanly for a few weeks.
2. Run `npm run build`.
3. In `public_html`, move the WordPress files into a backup folder, then upload **everything inside `dist/`**, including the hidden `.htaccess` files.
4. Edit `public_html/api/config.php` if needed: recipients, and a `from_email` on a domain the host can send for.
5. Make sure `public_html/api/data/` is writable (755 or 775). Every enquiry is also saved to `api/data/enquiries.csv` as a backup, so a lead survives an email failure.
6. Submit a test quote and a test support request and confirm both emails arrive.
7. Open `https://itrentals.in/sitemap-index.xml` and submit it in Google Search Console.

If emails don't arrive, the host may require SMTP. The handler uses PHP `mail()`; switching to SMTP is a small change in `public/api/enquiry.php`.

### Keeping Google rankings (same domain)

The domain doesn't change, so rankings carry over as long as old URLs don't break:

1. Download the old sitemap (`https://itrentals.in/sitemap.xml` or `/wp-sitemap.xml`) **before** switching.
2. For every old URL that doesn't exist on the new site, add a 301 line in `public/.htaccess` (examples are there, commented out). Map each to the closest page, not the home page.
3. After launch, watch Search Console → Pages → "Not found (404)" for a few weeks and add any missed redirects.
4. Create or claim Google Business Profiles for the **Gurgaon** and **Bangalore** offices only.

---

## Things to confirm before launch

These are marked in the code or currently published at your request. Please review:

- [ ] **Email**: `support@gcventure.in` is used site-wide. The brand shows no GC mention, so an `@itrentals.in` address may be better (`site.ts` + `api/config.php`).
- [ ] **Gurgaon address**: the company profile says **836 A**, Tower B3, Spaze iTech Park; the brief says **Office 821/A**. Currently 836 A.
- [ ] **Bangalore address**: profile says **HN 49, Royal Placid Layout, HSR Layout, 560102**; brief says **KNA Complex, First Floor, Haralur Main Road, HSR Layout, 560068**. Currently the profile version.
- [ ] **Service promises** (all currently published, please confirm the wording): zero security deposit, no lock-in, same/next-day delivery, 24/7 support, no advance payment, software pre-installed, monthly billing, up to 50% lower cost.
- [ ] **Preparation steps** on the home page (inspection, testing, diagnostics, cleaning, configuration, security check, packaging, scheduled delivery): confirm these match how devices are actually prepared.
- [ ] **Product photos**: HP, Dell and Mac models use the photos you supplied (the Mac lock-screen name and picture were removed); Lenovo, desktop and monitor photos are from Pexels (free commercial licence; see `PHOTOS` in `src/data/products.ts`). Confirm you may use the supplied photos commercially, and swap in photos of your own stock when you can.
- [ ] **Business hours** (`CONTACT.BUSINESS_HOURS`).
- [ ] **Client list**: 17 names shown. Ericsson, Samsung, Tower and Xceed are hidden until confirmed.
- [ ] **About page copy**: leadership bios (Vivek Garg, Managing Director, 20+ years; Lakhendra Prasad, Partner and Managing Lead for Operations), the team section, the "How we work" principles and the focus tags. Both leadership photos are in (`public/brand/vivek-garg-*.webp`, `public/brand/lakhendra-prasad-*.webp`).
- [ ] **Current inventory**: models are from the old site with "Confirm availability". Add newer models, specs, photos and prices when ready.
- [ ] **Desktop and monitor specs** (processor/RAM per model) so those pages can be indexed.
- [ ] **Surat and Patna**: shown on the map as service areas (from the company profile) without their own pages.
- [ ] **Privacy policy and terms**: legal entity details, grievance officer, retention, rental terms.
- [ ] **Testimonials**: written approval to publish quotes from Balaji Viswanathan, Charandeep Dora and Manoj Chandran (with role and company).
- [ ] **Old URL list** for the 301 redirect map.
- [ ] **Brand logos on the home page**: the laptop shows the Apple, HP, Dell and Lenovo logos to name the brands you rent (common practice for resellers and rental firms; a trademark line is in the footer). Confirm you are comfortable with this, or switch to brand names only.
- [ ] **Office video** (`public/media/`): "People working on office using computer" by RDNE Stock project, Pexels licence (free for commercial use; credit shown on the video). Replace with footage of your own team or deliveries when you have it.
- [ ] **Upgrade options**: laptops offer RAM up to 16 GB (6th–8th Gen) or 32 GB (10th Gen and newer) and SSD up to 1 TB. Confirm these match what you can supply.
- [ ] **Laptop list entries to double-check** (kept exactly as supplied): Dell Latitude 5280, 5380, 5480, 5580, 7280 and 7380 are listed with 8th Gen (these models shipped with 6th/7th Gen; the 8th Gen versions are 5290, 5390, 5490, 5590, 7290 and 7390), and Latitude 3420, 3520, 5420 and 5520 are listed with 12th Gen (these shipped with 11th Gen; the 12th Gen versions are 3430, 3530, 5430 and 5530).
- [ ] **Google Analytics 4 ID** (`ANALYTICS.GA4_ID`). Phone, WhatsApp, email and form-submit events are already wired.

---

## Design system

- **Colour:** paper `#F3EEE5`, ink `#17140F`, logo red `#E03328` (large shapes) and `#C42B1F` (text and buttons, 5.7:1 with white), plus green/blue/amber used only to tell equipment families apart. Tokens are in `src/styles/global.css`.
- **Type:** Newsreader (display serif, optical sizing), Geist (text), Geist Mono (small labels). Self-hosted, no Google Fonts request.
- **Signature elements:** the laptop hero on a wine-black stage with a field of faint library icons, serif headlines, hairline structure, spec-sheet product cards. One accent colour (logo red).
- **Icons:** Lucide geometry with a corner "service-state" badge in the accent colour, following the Visual Asset Library (`src/components/Icon.astro`, e.g. `<Icon name="laptop" badge="clock" />`).
- **Map:** official outline of India from `@svg-maps/india` (CC BY 4.0, credited on the map). Pins are projected from real coordinates in `src/data/geo.ts`.

## Quality checks run

- axe-core (WCAG 2.2 AA + best practice): 0 issues on 12 page types at 1440 px and 390 px.
- Unique titles (≤ 62 chars) and meta descriptions on every indexable page; one H1 per page; canonical URLs; valid JSON-LD (Organization, LocalBusiness ×2, Service, Product, FAQPage, BreadcrumbList).
- No horizontal overflow at 390 px; no console errors.
- Form handler tested: valid submissions, validation errors, origin check, honeypot, rate limit, attachment, no-JS redirect.
