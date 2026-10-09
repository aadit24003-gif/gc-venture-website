# SEO: audit, strategy and setup

This file records how the site's search setup works, what was changed, the keyword plan, and what still needs the owner's input. Everything here describes the code in this repository (Astro static site, deployed as plain files to Apache/cPanel).

## How it works

| What | Where | Notes |
|---|---|---|
| Title, description, canonical, robots, Open Graph, Twitter | `src/layouts/Base.astro` | Every page passes `title` and `description`. " \| IT Rentals" is added when it fits in about 62 characters. Canonical is the page's own absolute `https://itrentals.in/…/` address. |
| Noindex | `noindex` prop on `Base` | 404, thank-you, the two legal drafts, and catalogue models with too little information (`isThin` in `src/data/products.ts`). Noindex pages carry no canonical and only the Organization in their structured data. |
| Structured data | `Base.astro` builds one `@graph` per page | Organization (`https://itrentals.in/#organization`), WebSite, the page itself (WebPage, AboutPage, ContactPage or CollectionPage) and BreadcrumbList where breadcrumbs are visible. Pages add their own nodes: Service (category and city pages), ItemList (catalogue), Person (About). |
| Sitemap | `@astrojs/sitemap` in `astro.config.mjs` | Built as `/sitemap-index.xml` → `/sitemap-0.xml`. The noindex pages are excluded by the same rules that set noindex. Filtered catalogue addresses (`/equipment/?brand=…`) are never listed. No `lastmod`, because the build has no reliable per-page change date. |
| robots.txt | `public/robots.txt` | Everything open except `/api/` (form handlers). Pages kept out of search use noindex rather than Disallow, so crawlers can read the noindex. |
| Redirects, HTTPS, host | `public/.htaccess` | HTTP and www go to `https://itrentals.in` in one 301. Trailing slash is added. Old WordPress addresses 301 to their closest new pages. Custom 404 at `/404.html`. |
| Business facts | `src/config/site.ts` | Name, phones, email, offices, service claims (each can be switched off), GA4 and Search Console IDs, `sameAs` profiles. |
| Conversion tracking | `src/scripts/track.ts`, `src/scripts/forms.ts` | GA4 events (see below). Nothing loads until `ANALYTICS.GA4_ID` is set. |

## Audit (October 2026, before this round)

What was already right: static HTML for every page (no JavaScript needed to read content or links), unique titles and descriptions, one H1 per page, self-canonicals on the production domain, a sitemap that already excluded noindex pages, alt text and width/height on every image, lazy loading below the fold, 301s from the old WordPress site, a real 404 status, and a catalogue whose filters stay on one canonical address.

Problems found and fixed:

1. **Unconfirmed office addresses were marked up as LocalBusiness** on every page, with every city listed as their service area. The two addresses differ between your source documents (Gurgaon 836 A or 821/A; Bangalore HSR Layout or KNA Complex, Haralur Road). LocalBusiness markup is now added only for offices marked `confirmed: true`.
2. **Structured data was split into separate, unlinked blocks** (two or three per page; WebSite only on the home page). Now there is one connected graph per page with stable `@id`s.
3. **FAQ markup on 138 pages.** Google shows FAQ rich results only for well-known government and health sites, so it added weight without benefit. The FAQs stay on the pages; the markup is removed.
4. **The catalogue's model list in structured data included the 13 noindex models.** Now it lists only models with indexable pages.
5. **robots.txt blocked `/thank-you/`**, so crawlers could never see its noindex. Removed.
6. **The 404 page declared a canonical** pointing to `/404/`. Noindex pages no longer carry one.
7. **Invented wording on city pages.** "The sectors that drive most of our {city} enquiries" claimed enquiry data that doesn't exist. Delhi's intro implied a ministry office and a Pragati Maidan conference as customers. Every city page said "Same-day or next-day in most cases". All three were rewritten so they no longer claim anything unverified.
8. **Titles with stacked keywords** ("Laptop on Rent for Business | Laptop Rental India | IT Rentals"; "Laptop on Rent in Delhi | Business Laptop Rental | IT Rentals"). Rewritten as one clear phrase each.
9. **The Kerala page** lived at `/laptop-on-rent-in-kerala/` but its title and H1 said Kochi, though it covers Kochi and Thiruvananthapuram. It now says Kerala.
10. **Vague headings**: Contact "Talk to us", Locations "Where we deliver". Made specific.
11. **Tracking gaps**: no event when someone starts a form, clicks through to the quote form, or filters the catalogue. Added.
12. **Social sharing**: no image size or alt text. Added.

## Keyword and page map

Search volumes and difficulty were **not** measured: no keyword tool (Google Keyword Planner, Ahrefs, Semrush) was available. What is below comes from the site's real pages, a look at current results for the main phrases (other Indian rental firms, IndiaMART listings, articles; "laptop on rent" is the phrasing Indian searchers and competitors use most), and the addresses the old site already ranked for. Verify volumes in Keyword Planner and Search Console before investing in new pages.

| Main search intent | Page | Title | H1 | Links to | Status |
|---|---|---|---|---|---|
| Laptop / IT equipment rental for businesses, India-wide | `/` | Laptop & IT Equipment Rental Across India \| IT Rentals | IT Rentals: One-stop solution for all your renting needs (brand line kept) | every category, catalogue, quote, locations | Done; screen text now says "for teams anywhere in India" |
| Laptop on rent for companies / corporate / bulk laptop rental | `/laptop-rental/` | Laptop on Rent for Businesses Across India \| IT Rentals | Laptop rental for teams of ten to a thousand | catalogue (laptops), models, MacBook, desktop, quote | Done |
| MacBook rental for business | `/macbook-rental/` | MacBook on Rent for Businesses: Air, Pro & iMac \| IT Rentals | MacBook rental for design, engineering and leadership teams | MacBook Air / Pro pages, quote | Done |
| Desktop / computer rental for offices | `/desktop-rental/` | Desktop on Rent for Offices, BPOs & Labs \| IT Rentals | Desktop rental for floors, labs and fixed seats | monitors, catalogue (desktops), quote | Done |
| Monitor rental | `/monitor-rental/` | Monitor on Rent: 22" & 24" Monitors for Offices & Events | Monitor rental for desks, dual screens and events | desktops, quote | Done |
| Server rental | `/server-rental/` | Server on Rent: Rack & Tower Servers \| IT Rentals | Server rental for migrations, test labs and temporary sites | routers, IT equipment, quote | Done |
| Router / Wi-Fi rental | `/router-rental/` | Router & Wi-Fi Equipment on Rent for Sites & Events | Router and Wi-Fi rental for sites, branches and events | servers, quote | Done |
| Mobile phone rental for business | `/mobile-phone-rental/` | Mobile Phones on Rent for Field Teams & App Testing | Mobile phone rental for field teams and app testing | quote | Done |
| IT equipment / IT infrastructure rental, complete setups, enterprise deployments | `/it-equipment-rental/` | IT Equipment on Rent for Businesses in India \| IT Rentals | IT equipment rental for complete setups | all categories, quote | Done |
| Specific models ("Dell Latitude 5440 on rent") | `/equipment/<model>/` (102 indexable) | "<Model> on Rent (<processor>)" | the model name | category, related models, quote | Unchanged (already specific) |
| Browse / compare rental laptops | `/equipment/` | Equipment Catalogue: Laptops & Desktops on Rent | Equipment catalogue | every model | Done (CollectionPage) |
| Laptop rental in <city> | `/laptop-on-rent-in-<city>/` (14) | Laptop on Rent in <City> for Businesses \| IT Rentals | Laptop rental in <City> for businesses and teams | other cities, categories, models, quote | Done |
| Where the company delivers | `/locations/` | Laptop & IT Equipment Rental Locations Across India | IT equipment rental across India | every city page, offices | Done |
| Company, credibility | `/about/` | About IT Rental Solutions: IT Equipment Rental Since 2013 | Renting IT to Indian businesses since 2013 | contact, quote | Unchanged |
| Contact, enquiry | `/contact/`, `/request-a-quote/` | Contact Us: Laptop & IT Equipment Rental Enquiries; Request a Quote: Laptop & IT Equipment Rental | Talk to us about renting IT equipment; Tell us what your team needs | — | Done |
| Workstation rental | none yet | — | — | — | **Needs your confirmation** (see below). The old site's `/services/workstation…` addresses redirect to `/desktop-rental/`. |

"Short-term and long-term rental" is covered inside the category pages (no lock-in, project and hiring use cases) rather than as separate pages that would compete with them.

## Location pages

- **Kept (14):** Gurgaon, Delhi, Noida, Ghaziabad, Bangalore, Mumbai, Pune, Hyderabad, Chennai, Kolkata, Jaipur, Lucknow, Chandigarh, and Kerala (Kochi and Thiruvananthapuram). Each has its own introduction, business areas, local sectors and questions, not just a swapped city name. They also keep the addresses the old site was already indexed under.
- **What they claim:** an office only in Gurgaon and Bangalore (shown with the address); everywhere else "Serving businesses in …". No local phone numbers, staff, testimonials or delivery-time promises. The structured data marks each as a Service the company provides in that city, not a local business.
- **Shown on the map without a page:** Surat, Patna. Give them a page only when you confirm regular demand there and can add something specific.
- **Not created:** extra city pages. The guidance is to add one only when you serve the city regularly and can add something specific (areas covered, sectors, how delivery and support work there).
- **Watch:** Noida and Ghaziabad are the thinnest. If Search Console shows few impressions for them after about six months, consider folding them into one Delhi NCR page with 301 redirects.

## Conversion events (GA4)

| Event | Fires when | Counts as a lead? |
|---|---|---|
| `generate_lead` | the server accepted a quote or enquiry form | **Yes**: mark it as a key event in GA4 |
| `support_submit` | the server accepted a support request | No (existing customer) |
| `form_start` | first interaction with a quote or support form | No |
| `quote_click` | a link to the quote form was clicked | No |
| `phone_click`, `whatsapp_click`, `email_click` | a contact link was clicked | No (intent only) |
| `catalogue_filter` | a catalogue filter or home builder choice changed (control name and chosen option only) | No |

Each event carries `page_path` and, for clicks, where on the page it happened (`header`, `footer`, `hero`…). No names, numbers, emails or typed text are ever sent.

## Measured results (this round)

Lighthouse 12, mobile emulation, local production build. These are lab numbers; real visitors' numbers appear in Search Console about 28 days after launch.

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/` | 90–92 (82 in one cold run) | 100 | 100 | 100 | 3.3–3.4 s | 0 | 20–140 ms |
| `/laptop-rental/` | 98 | 100 | 100 | 100 | 2.3 s | 0 | 0–10 ms |
| `/equipment/` | 98 | 100 | 100 | 100 | 2.3 s | 0 | 20 ms |
| `/laptop-on-rent-in-mumbai/` | 98 | 100 | 100 | 100 | 2.4 s | 0 | 0 ms |
| `/equipment/dell-latitude-5480/` | 95 | 100 | 100 | 100 | 2.7 s | 0 | 0 ms |

The home page's slower first paint comes from laying out its large animated sections, not from loading. Inlining the CSS was tried, measured, and reverted because it didn't help.

## Needs your confirmation

1. **Office addresses:** Gurgaon 836 A or 821/A, Tower B3, Spaze iTech Park; Bangalore HSR Layout or KNA Complex, Haralur Main Road. Once confirmed, set `confirmed: true` in `OFFICES` (`src/config/site.ts`). The offices are then marked up as LocalBusiness branches, and you can create a matching Google Business Profile for each office (and only for real offices).
2. **Service promises** shown across the site (each switchable in `CLAIMS`): same or next-day delivery, 24/7 support, zero security deposit, no advance payment, no lock-in, up to 50% lower cost. Confirm each is accurate everywhere you deliver, or switch it off.
3. **Workstations:** do you rent them (e.g. Dell Precision, HP Z, Lenovo ThinkStation)? If yes, with which models, a `/workstation-rental/` page can be added; the old site's workstation addresses currently redirect to desktops.
4. **The cities you actually deliver to and support**, to confirm the 14 pages plus Surat and Patna.
5. **Official profiles** (LinkedIn, Google Business Profile, IndiaMART, …) for `SITE.sameAs`.
6. **Legal pages:** registered entity name, CIN, address, grievance officer. Once filled in, remove `noindex` from `/privacy-policy/` and `/terms/` (and from the sitemap filter in `astro.config.mjs`).
7. **Email domain:** the site uses support@gcventure.in while the domain is itrentals.in. Consider an @itrentals.in address for consistency. The form handler already sends from no-reply@itrentals.in, so that domain needs SPF/DKIM set up for mail to arrive.
8. **Testimonials and case studies:** none are published. Add them only with written approval.

## Your steps after upload

1. **Form email:** submit one test quote on the live site and check it arrives at support@gcventure.in. Locally the form handler was tested end to end (validation, saving to `api/data/enquiries.csv`, success message), but this machine has no mail server, so the email step itself must be tested on the host.
2. **Google Analytics 4:** create a GA4 property for itrentals.in, copy the Measurement ID (`G-…`) into `ANALYTICS.GA4_ID`, rebuild and upload. In GA4 → Admin → Events, mark `generate_lead` as a key event. Optionally link GA4 to Search Console.
3. **Google Search Console:** add a **Domain** property for `itrentals.in` and verify it with the DNS TXT record (at your domain registrar). This covers http, https, www and non-www. If DNS isn't possible, use a URL-prefix property for `https://itrentals.in/` with the HTML tag method: paste the code into `ANALYTICS.GOOGLE_SITE_VERIFICATION`, rebuild and upload.
4. **Submit the sitemap:** Search Console → Sitemaps → `https://itrentals.in/sitemap-index.xml`.
5. **Check the move from WordPress:** in Search Console → Pages, watch "Not found (404)" for old addresses and add a 301 for each in `public/.htaccess`. Use URL Inspection on the home page, `/laptop-rental/` and a city page to confirm Google sees the rendered content.
6. **Bing Webmaster Tools:** import the site from Search Console (or paste its code into `ANALYTICS.BING_SITE_VERIFICATION`).
7. **Check the structured data live:** run the home page, a category page and a city page through Google's Rich Results Test and the Schema Markup Validator (validator.schema.org).
8. **Monitor:** monthly in Search Console, look at Performance (queries and pages, filtered to India), Pages (indexing problems) and Core Web Vitals (real-user speed). In GA4, look at `generate_lead` by landing page.

No ranking, traffic or indexing date can be promised. These changes make the site easy to crawl, clear about what it offers and where, and honest about what it can back up.
