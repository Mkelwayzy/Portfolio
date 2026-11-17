# Mostafa Khaled — Portfolio

A bilingual portfolio for brand identity, 3D design, and visual work.

## Project structure

- `index.html` — redirects the site root to the portfolio page.
- `Portfolio.html` — page markup.
- `assets/favicon.svg` — custom portfolio tab icon.
- `assets/css/styles.css` — custom styles and animations.
- `assets/js/app.js` — portfolio data, page interactions, CMS, routing, and PDF export.

## Run locally

Serve the project directory with any static web server. For example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

The page loads Tailwind CSS, IBM Plex fonts, jsPDF, and Supabase JS from external CDNs, so those features require an internet connection.

The carousel prioritizes its first cover image and lazily loads the remaining project, gallery, and related-project images. The portfolio also supplies bilingual page titles/descriptions, a custom favicon, and baseline Open Graph, Twitter, canonical, and Person structured metadata. Project details still use the existing hash routes, so they do not have independently crawlable URLs or server-rendered social previews.

## Content and publishing

The admin dashboard reads public portfolio content from Supabase and requires an authorized Supabase Auth account to publish changes. Project images, attached PDFs, and uploaded logos are stored in the public `portfolio-assets` bucket; only an allowlisted admin can upload or change content.

### AI project-writing assistant

The project editor can send a narrative to [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash) and receive a draft for the existing project fields. It does not publish projects or handle images. The Supabase Edge Function checks the caller's admin membership, keeps the Gemini API key server-side, limits narrative length, and only returns the supported country, year, and software values.

To enable it:

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey) for a project that has no billing account linked.
2. In the Supabase Dashboard, open **Edge Function Secrets** and add `GEMINI_API_KEY`. Never add the key to `assets/js/supabase-config.js` or commit it.
3. Install and sign in to the [Supabase CLI](https://supabase.com/docs/guides/cli), then deploy the function:

   ```bash
   supabase login
   supabase functions deploy draft-project --project-ref anvadgrhanqewgxygisg
   ```

4. Keep JWT verification enabled for the function. Its database admin check also requires the existing `portfolio_admins` table and policies from [`supabase/setup.sql`](./supabase/setup.sql).

Before each request, the admin must consent to sending the narrative to Google. Under Google's [current free-tier terms](https://ai.google.dev/gemini-api/docs/pricing), submitted content may be used to improve Google products; avoid confidential client information. The portfolio does not save the narrative or API key. Access and quotas can change; the function does not choose a paid model, but Google controls whether an API project is on a free or paid tier, so do not link a billing account if zero charges are required.

The project editor includes the fields shown on the public project page: bilingual title, client, category, role, summary, challenge, deliverables, and visual direction, plus optional outcome and impact text. Choose a country (Egypt, Saudi Arabia, Kuwait, or Oman) and a year (2018 onward), and select software from the available list. Select a cover image to see its separate live card preview with the country, title, details, and selected crop ratio; the cover remains separate from freeform canvas media. Images can be up to 15 MB each; canvas videos (MP4/WebM) and PDFs can be up to 100 MB each and use resumable uploads. When editing a published project, use **Save PDF changes to this project** to attach PDF changes without publishing other unsaved form edits. Visitors can preview attached PDFs inline on the project page or open/download them.

Project case studies also support optional outcome and impact text in English and Arabic. Include measurable claims only when you can verify them.

Reorder published projects by dragging their cards or using the up/down controls; this order is shared by the homepage carousel and project navigation. New projects can use a three-column media grid with per-image ratios such as 4:3 and Story 9:16, or a freeform canvas. The freeform canvas supports dragging images, videos, and PDFs to move them, resize them from a corner, and move them between layers. Its alignment toolbar aligns media by top, center, or bottom edges, or along shared horizontal/vertical center lines. Images can be cropped, zoomed, and repositioned, and visitors can click project images to view them larger. Videos (MP4/WebM) and PDFs support uploads up to 100 MB each and appear inline in freeform layouts. Existing published projects keep their previous display unless explicitly requested otherwise; Reem Cookies uses square 1:1 cover/gallery frames, and Samsu Brand preserves original image proportions without cropping. To allow media uploads, rerun [`supabase/setup.sql`](./supabase/setup.sql) so the Storage bucket allows MP4 and WebM, and ensure the Storage global file-size limit is at least 100 MB; the project plan must permit uploads of that size.

The admin dashboard's **Marketing / التسويق** tab offers 20 downloadable PNG layouts for published projects: 12 light and 8 dark designs. Each layout features the project title, six project images, the supplied brand logo, WhatsApp and email contact details, and works as either a 1080 × 1350 px post or a 1080 × 1920 px story. Image hosting must allow cross-origin canvas export for downloads to work.

### Supabase setup

1. In the SQL Editor for the same Supabase project configured in the website, run [`supabase/setup.sql`](./supabase/setup.sql).
2. In **Authentication → Users**, create and confirm the admin account with an email and password. Disable public sign-ups in the Auth settings; the database allowlist still blocks non-admin writes.
3. In the SQL file's final example, replace `YOUR_ADMIN_EMAIL` with that account's email, uncomment the statement, then run it to allowlist the account.
4. Confirm the website's Supabase project URL and **publishable** key in [`assets/js/supabase-config.js`](./assets/js/supabase-config.js). The publishable key is intended for browser use; never put a `service_role` or secret key in this repository.
5. Open the portfolio and sign in with the authorized email and password. If the content table is empty, the dashboard publishes the existing portfolio content on first sign-in.

If sign-in fails, the login form displays Supabase's error message. “Invalid login credentials” means the email/password was rejected or the user was not created in **Authentication → Users**; “not authorized” means the account still needs to be added to `portfolio_admins` using step 3.

Row-level security limits content writes and media uploads to IDs in `portfolio_admins`; visitors can only read the published content and images. Do not remove these policies. CMS content is stored centrally and shared with site visitors, rather than only in one browser. Previous browser-saved CMS content is used as a fallback and is migrated when the first remote save succeeds.
