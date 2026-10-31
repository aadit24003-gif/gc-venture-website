/**
 * Starting text for the editable pages. Staff edit them in /admin/content; placeholders in
 * double braces are filled from settings and config when the page is shown.
 * [CONFIRM] Every page here needs review by a lawyer before launch; each starts flagged.
 */
export const DEFAULT_PAGES: { slug: string; title: string; summary: string; body: string }[] = [
  {
    slug: 'terms',
    title: 'Terms of sale',
    summary: 'These terms apply when you buy from {{brand}}. They are written to be read; if anything is unclear, ask us.',
    body: `## Who we are
{{brand}} is run by {{legal_name}}{{gstin_clause}}, {{registered_address}}. Contact us at {{support_email}}.

## What we sell
Refurbished laptops: previously used, then inspected, repaired where needed, tested, cleaned, wiped and graded by us.

- Photos on a model's page are the manufacturer's official photos of that model.
- Each laptop on sale is a specific unit with its own condition report: grade, measured battery and SSD health, cosmetic notes and the result of every check. The unit you choose is the unit we ship.
- Brand names belong to their owners. We are not an authorised reseller of, or affiliated with, any manufacturer, and manufacturer warranties do not apply. Our own warranty does.

## Prices and payment
- Prices are in Indian rupees and include GST. {{shipping_clause}}
- Online payments are processed by Razorpay; we never see or store your card details. Card EMI interest is set by your bank.
- If a price is clearly wrong because of an error, we will tell you before dispatch and you may cancel for a full refund.

## Orders
Your order is confirmed when payment succeeds, or when you choose pay on delivery and we send the confirmation. Online orders that aren't paid within 30 minutes are cancelled automatically and the laptop goes back on sale. We may cancel an order if the laptop fails its final check before dispatch, if we suspect fraud or bulk resale, or if we can't deliver to the address; you are refunded in full.

## Student discount
The {{student_percent}}% student discount is for individuals currently enrolled at a recognised school, college or university, verified with a college email or student ID. It lasts {{student_months}} months, applies to {{student_units}} per order and does not combine with coupons. We may withdraw it and cancel orders if verification details turn out to be false.

## Delivery, returns and warranty
See [Shipping](/shipping), [Returns and refunds](/returns) and [Warranty](/warranty). They form part of these terms.

## Reviews
Only customers who received a laptop from us can review it. We publish reviews after checking them for abuse and personal data; we do not remove reviews for being negative.

## Liability
We are responsible for losses that are a foreseeable result of us breaking these terms. We are not responsible for data on a device you send to us; please back it up. Nothing here limits your rights under the Consumer Protection Act, 2019 or the Consumer Protection (E-Commerce) Rules, 2020.

## Grievances
Write to our grievance officer{{grievance_officer}} at {{grievance_email}}. We acknowledge complaints within 48 hours and resolve them within one month.

## Law
These terms are governed by the laws of India. Courts at Gurugram, Haryana have jurisdiction, without affecting your right to approach a consumer commission where you live.`,
  },
  {
    slug: 'privacy',
    title: 'Privacy',
    summary: 'What {{brand}} collects, why, who it is shared with, and how to have it deleted. We collect the least we need to sell and support your laptop.',
    body: `## What we collect
- **Account:** your mobile number and/or email address, your name and, if you set one, a password (stored only as a one-way hash).
- **Orders:** delivery address, phone, items, payment status and, if you give it, your GSTIN. Card and UPI details go to Razorpay, not to us.
- **Shopping:** your cart, wishlist and recently viewed laptops, saved on our servers so they follow you between devices.
- **Student verification:** your name, college, course, graduation year, and either your college email address or a photo of your student ID.
- **Support:** messages you send us, return and warranty requests and the photos you attach.
- **Newsletter:** your email, only if you subscribe.
- **Technical:** a session cookie that keeps you signed in, a cart cookie for guests, and server logs (IP address, browser) kept for security.

## Why we use it
- To sign you in, process and deliver orders, provide warranty service, and send order updates by email, SMS or WhatsApp.
- To verify student status. ID photos are seen only by the staff member checking them.
- To prevent fraud and to meet tax and accounting law.

We don't sell your data, and we don't send marketing without your consent. You can unsubscribe from any newsletter email.

## Who we share it with
- Razorpay, to take payments; the courier, to deliver; SMS, WhatsApp and email providers, to send codes and updates; our hosting and database providers, to run the store. Each uses it only for that purpose.
- Authorities, when the law requires it.

## How long we keep it
- Student ID photos: deleted {{id_retention_days}} days after we approve or reject them.
- Login codes: unusable after 10 minutes and stored only as a scrambled value.
- Orders and invoices: 8 years, as required by tax law.
- Your account: until you ask us to delete it.

## Your rights
Under the Digital Personal Data Protection Act, 2023 you can ask to see, correct or delete your data, or withdraw consent. Write to {{grievance_email}}; we reply within 30 days.

## Who is responsible
{{legal_name}}, {{registered_address}}. Grievance officer{{grievance_officer}}, {{grievance_email}}.`,
  },
  {
    slug: 'returns',
    title: 'Returns, refunds and cancellations',
    summary: 'Changed your mind, or it isn’t what you expected? Send it back within {{return_days}} days of delivery and we refund what you paid.',
    body: `## Cancelling an order
You can cancel any order until it ships, from your account or by contacting us. Paid orders are refunded in full to the original payment method. Once it has shipped, refuse the delivery or return it as below.

## Returning a laptop
- Start a return from **Your account → Orders** within {{return_days}} days of delivery. You don't have to give a reason.
- Pack it with its charger, preferably in the original box. Sign out of your accounts and remove any password.
- We collect it free of charge from the delivery address.
- Returns are checked against the condition report the unit was sold with. If it comes back damaged, or with parts missing or changed, we may deduct the cost of putting that right and tell you before we do.

## Arrived faulty or not as described?
Tell us within 48 hours of delivery with photos or a short video, choosing **Replacement** or **Return** in your account. We collect it and send a replacement unit, or refund you if you prefer. If the box was visibly damaged in transit, a video of you opening it helps us claim from the courier.

## When the money reaches you
- We start the refund within 2 working days of receiving the laptop back. You can follow its status in your account.
- UPI, cards, net banking and wallets: back to the same account, usually in 5 to 7 working days, depending on your bank.
- Pay on delivery orders: by bank transfer or UPI to an account you give us.
- Student discounts and coupons are not refunded as cash; you get back what you actually paid.`,
  },
  {
    slug: 'warranty',
    title: '{{warranty_months}}-month warranty on every laptop',
    summary: 'If something stops working because of a fault, we fix it, swap it, or refund you. Here is exactly what that means.',
    body: `## How long it lasts
The warranty starts on the day the laptop is delivered and lasts {{warranty_months}} months{{extension_clause}}. It is tied to the laptop's serial number and stays with it if you sell or gift it. You can see it, with its end date, in your account.

## What is covered
- Any hardware fault under normal use: motherboard, memory, storage, screen, keyboard, touchpad, ports, speakers, camera, Wi-Fi and the charger we supplied.
- The battery, if it stops charging or its health drops below 50% during the warranty.
- Software problems we caused, such as an operating system that won't activate.

## What is not covered
- Drops, cracks, dents and liquid damage after delivery.
- Repairs or upgrades by anyone else, or a broken warranty seal.
- Normal battery ageing above 50% health, and cosmetic wear after delivery.
- Software you installed, viruses, forgotten passwords and lost data. Keep backups.

## How a claim works
1. Open **Your account → Warranty** and choose the laptop, or contact us with your order number. Describe the fault; a short video helps.
2. We try to solve it remotely first. If it needs a repair, we arrange a free pickup.
3. We repair it, usually within 5 working days of receiving it, and send it back free. If we can't repair it, we replace it with the same or a better model, or refund what you paid.

## Your rights
This warranty is in addition to your rights under the Consumer Protection Act, 2019. It does not limit them.`,
  },
  {
    slug: 'shipping',
    title: 'Shipping and delivery',
    summary: 'Insured until it reaches you, and tracked from our workshop to your door.',
    body: `## When it ships
Orders get a final check, are packed and handed to the courier within {{dispatch_min}} to {{dispatch_max}} working days of payment (or of confirmation, for pay on delivery). You get the tracking number as soon as it leaves, and can follow every step in your account.

## How long delivery takes
- Delhi NCR, Mumbai, Pune, Bengaluru, Chennai, Hyderabad, Kolkata and Ahmedabad: 2 to 4 working days after dispatch.
- Most other cities and towns: 4 to 7 working days.
- The North-East, Jammu and Kashmir, Ladakh and the islands: 6 to 10 working days.

Product pages show an estimate and whether we deliver to your PIN code. Couriers occasionally run late around festivals and severe weather; we chase them for you.

## Costs
{{shipping_clause}} {{cod_clause}}

## Receiving your laptop
- Someone at the address may need to show the one-time code the courier sends, for high-value parcels.
- Check that the tamper tape is intact before accepting. If the box is damaged, you can refuse it.
- Record a short video while unboxing. It makes any transit claim quick.

## If a delivery fails
The courier tries up to three times. If the parcel comes back to us, we contact you to arrange a new delivery or refund you in full.`,
  },
];
