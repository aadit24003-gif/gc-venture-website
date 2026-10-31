# Going live

Every setting is listed in `store/.env.example`. Add values in Vercel → Project → Settings → Environment Variables (never in the code). In order:

1. **Supabase** (database and file storage). Create a project in the Mumbai region. Copy the *Transaction pooler* URI (port 6543) into `DATABASE_URL`, and the project URL and *service role* key into `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Create two buckets: `student-ids` (private) and `product-photos` (public). Tables are created on first start.
2. **Vercel** (hosting). Import the GitHub repository, set **Root Directory** to `store`, add the variables, deploy. Set `NEXT_PUBLIC_SITE_URL` to your domain and `AUTH_SECRET` to a long random string (`openssl rand -hex 32`). Put your email in `ADMIN_EMAILS`. Leave `DEMO_MODE` empty.
3. **First sign-in.** Open `/admin`, sign in with the admin email, then fill **Settings** (business name, GSTIN, grievance officer, contact, shipping, GST), check **Laptop models** prices, and **receive your real units** in Inventory (serial, battery, inspection, then List for sale). A production database starts with no units; nothing shows as in stock until you list some.
4. **Razorpay.** Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (test keys work at once). Create a webhook to `https://<domain>/api/razorpay/webhook` with events `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed`, and put its secret in `RAZORPAY_WEBHOOK_SECRET`. For live mode Razorpay reviews your business documents and the contact, terms, refund, shipping and privacy pages (all built).
5. **Resend** (email). Add `RESEND_API_KEY`, verify your domain, set `EMAIL_FROM`. Send yourself a test from Admin → Notifications.
6. **MSG91** (SMS, optional at launch). Register your sender ID and templates on DLT (takes days). Set `MSG91_AUTH_KEY` and `MSG91_OTP_TEMPLATE_ID`; enter each order-update template ID in Admin → Notifications and switch it on. Until then customers sign in by email.
7. **WhatsApp** (optional). In Meta WhatsApp Manager, approve templates matching Admin → Notifications; set `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`; enter template names and switch them on.
8. **Shiprocket** (optional). Create an API user; set `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_PICKUP_LOCATION` and a `SHIPROCKET_WEBHOOK_TOKEN`; add the webhook `https://<domain>/api/shipping/webhook` with that token; choose Shiprocket in Admin → Settings → Shipping. Without it, staff enter courier and AWB by hand.
9. **Checks before launch.** `/api/health` returns `{ ok: true }`; place a real ₹1 test order with live keys and refund it; confirm emails arrive; run `npm run test:e2e` against a preview deployment with `BASE_URL=` (demo mode on that preview).

## Operations
- **Backups:** enable Supabase point-in-time recovery (Pro plan) or daily backups.
- **Migrations:** applied automatically at start; set `AUTO_MIGRATE=0` and run `npm run db:migrate` if you prefer to do it by hand.
- **Monitoring:** point an uptime monitor at `/api/health`; Vercel logs show failed emails and payments, and Admin → Notifications shows every message attempt.
- **Photos:** to add a new model's official photos, add its URLs to `scripts/product-image-sources.json` and push; the GitHub Action downloads and commits them.
