# Switching itrentals.in to the new website

The new site replaces the WordPress site on the same domain and the same hosting.
It takes about an hour. Nothing is deleted: the old site is kept and can be put back in minutes.

You need: the hosting login (GoDaddy / cPanel), and the file `itrentals-website-upload.zip`.

> First check your hosting type. Log in to GoDaddy → My Products. If the itrentals.in site
> shows **cPanel** (Web Hosting), follow this guide. If it shows **Managed WordPress**, it
> cannot host this site as-is; you would need a cPanel / Web Hosting plan (ask GoDaddy support
> to switch, or ask Claude for options).

---

## 1. Before you switch (15 minutes)

1. **Back up the old site.** cPanel → *Files* → *Backup* → *Download a Full Account Backup*.
   Also cPanel → *phpMyAdmin* → select the WordPress database → *Export* → *Go*. Keep both files.
2. **Save the old page list** so no Google ranking is lost. Open these in a browser and save
   each page (Ctrl+S): `https://itrentals.in/sitemap_index.xml` and `https://itrentals.in/wp-sitemap.xml`
   (one of them will work). Send them to Claude; any old page without a match gets a redirect.
   Redirects for the pages Google shows today are already included.
3. **Decide the launch items** from the checklist in `README.md` (legal pages, email address,
   promises, addresses). The site can go live without them, but the privacy policy and terms
   should be finished soon after.

## 2. Switch (20 minutes)

1. cPanel → *File Manager* → *Settings* (top right) → tick **Show Hidden Files** → Save.
2. Open `public_html`. Select everything in it (WordPress files and folders).
3. **Move** them out of the website, into a new folder in your home directory, for example
   `/home/<your-user>/old-wordpress-site`. (Do not leave them inside `public_html`, or the old
   site keeps running at a hidden address.)
   - Leave alone any folder that belongs to a subdomain or another site, if your host keeps
     those inside `public_html` (for example a `laptoponrent` folder). If unsure, ask your host.
4. In the now-empty `public_html`: *Upload* → choose `itrentals-website-upload.zip` → wait until done.
5. Right-click the zip → **Extract** → into `public_html`. Then delete the zip.
6. Check that `public_html/.htaccess` and `public_html/api/` exist. Set the folder
   `public_html/api/data` to permission **755** (right-click → *Change Permissions*).

## 3. Test (10 minutes)

1. Open `https://itrentals.in` in a private/incognito window. Click through Home, About,
   Services, a laptop, Locations, Contact, Raise a Complaint.
2. Open an old address, for example `https://itrentals.in/services/laptop-rental/`. It should
   jump to the new Laptop rental page.
3. **Submit a test quote** and a **test complaint** with your own details. Check the email
   arrives at support@gcventure.in (look in Spam too).
   - If no email arrives: every enquiry is still saved in `public_html/api/data/enquiries.csv`.
     The host may need the "from" address `no-reply@itrentals.in` to exist (create it in cPanel →
     *Email Accounts*), or may require SMTP. Tell Claude what you see and it will adjust the form.

## 4. After launch

1. **Google Search Console** (search.google.com/search-console): add `itrentals.in`, then
   *Sitemaps* → submit `sitemap-index.xml`. Over the next weeks check *Pages* → *Not found (404)*
   and send the list to Claude for redirects.
2. **Google Business Profile**: make sure the Gurgaon and Bangalore listings link to the site.
3. Keep the old WordPress backup for at least a month.

## If something goes wrong

Undo in five minutes: in File Manager, move the new files out of `public_html` and move the
contents of `old-wordpress-site` back in. The old site works exactly as before.

## Making changes later

Ask Claude for any change (text, models, photos, prices). You receive a new upload zip; repeat
step 2 (only the changed files need replacing, but replacing everything is fine).
