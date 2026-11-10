# IRA Ideas — iraideas.com

Rebuild of the IRA Ideas WordPress site as a fast static site on **Astro**, hosted on **Cloudflare Workers**.
The site audit (pages, colours, typography, integrations) is in [`docs/site-audit.md`](docs/site-audit.md).

## What's here

| Page | Path |
|---|---|
| Home | `/` |
| About | `/about-tim-berry/` |
| Videos | `/videos-ira-401k/` |
| Contact | `/get-in-touch-ira-401k-attorney/` |
| Privacy Policy | `/privacy-policy/` |
| Retirement Certainty Session ($125 booking) | `/retirement-certainty-session/` |
| Private Strategy Session (design only, booking not connected) | `/private-strategy-session/` |
| Blog (51 posts, paginated) | `/blog/`, `/blog/2/` … |
| Blog posts | `/<post-slug>/` (same URLs as WordPress) |
| Tag / category archives | `/tag/<slug>/`, `/category/<slug>/` |
| RSS feed | `/feed.xml` (`/feed/` redirects) |

The URLs match the WordPress site so search rankings carry over. "Book An Appointment" buttons go to the
Retirement Certainty Session page (`BOOKING_URL` in `src/data/site.ts`). Other funnel pages not listed here
remain on WordPress until they are migrated.

## Private Strategy Session

- Page: `src/pages/private-strategy-session.astro`. **Design only for now:** a visual copy of the WordPress page;
  its 13 sections are in `src/content/pss/` (copy, styles and UI scripts carried over).
- Booking is **not connected**: the WordPress booking script (membership check, availability, Stripe) is not included,
  the booking section's webhook/Stripe data attributes are blank, and the calendar shows a "not connected yet" note.
  A small display-only script fills in the time-zone list and month grid and makes the CTA buttons scroll to the booking card.
- Links to this session from the Retirement Certainty Session page still point at the working WordPress page.
- For wiring up booking later: the earlier black/gold implementation (`src/partials/private-strategy-session.html`,
  `src/scripts/private-strategy-session.js`, `src/styles/private-strategy-session.css`) is kept but not used, and the
  Worker still has the same-origin proxy endpoints `/api/pss/config`, `/api/pss/verification` and `/api/pss/booking`
  (configured with Worker secrets `PSS_VERIFICATION_WEBHOOK_URL`, `PSS_BOOKING_WEBHOOK_URL` and `PSS_STRIPE_PUBLISHABLE_KEY`).

## Retirement Certainty Session (booking)

- Page: `src/pages/retirement-certainty-session.astro`. Its sections are in `src/content/rcs/`, carried over
  from the WordPress page, so the copy, styles and scripts are the same.
- Booking flow (in `src/content/rcs/14-booking-form.html`, see the `CONFIG` block):
  1. Pick a date → `POST https://n8n.coreautomations.org/webhook/get-slots-ghl` → free GHL slots
  2. Enter details → Stripe Elements card → `stripe.createPaymentMethod()` (publishable key only)
  3. `POST …/webhook/booking-ghl` with the slot, details and `payment_token` → n8n charges and books in GHL
- No n8n or GHL changes are needed, **but the n8n webhooks must allow the new site's origin (CORS)**, e.g.
  `https://ira-ideas.<subdomain>.workers.dev` while testing, and `https://iraideas.com` stays the same after go-live.
- The background videos live in `public/media/rcs/`.

## Stack

- **Astro** (static HTML) + **Tailwind CSS v4**. Brand colours and fonts are set in `src/styles/global.css` (`@theme`).
- Self-hosted fonts: Roboto, Roboto Condensed, Inter, and Georgia headings (with Gelasio as a fallback for devices that lack Georgia).
- **Cloudflare Worker** (`worker/index.ts`) handles `POST /api/contact` and forwards submissions to an **n8n** webhook.
  All other routes are static files.
- `public/_redirects` sends old duplicate URLs to their new pages, and `public/_headers` sets security and caching headers.

## Blog

Posts are Markdown files in **`src/content/blog/`**; the file name is the URL (`what-is-an-ira.md` → `/what-is-an-ira/`).
To add a post, copy an existing file and change the front matter:

```md
---
title: "My new post"
description: "One or two sentences for Google and the blog cards."
pubDate: 2026-11-06T12:00:00Z
image: ../../assets/blog/my-photo.jpg   # optional, put the image in src/assets/blog/
imageAlt: "Describe the photo"
tags:
  - { slug: "self-directed-ira", name: "self directed IRA" }
---

Write the article here in Markdown.
```

Long quoted material (court rulings etc.) can go in a collapsible block:
`<details class="expand"><summary>Read the full ruling</summary> … </details>`.
PDFs linked from posts are kept at their old WordPress paths in `public/wp-content/uploads/`.

## Editing content

Most copy lives in **`src/data/site.ts`**: contact info, nav, services, FAQs, testimonials and the video list.
Add a video by adding `{ id: '<YouTube id>', title: '…' }` to `videos`.

## Develop

```bash
npm install
npm run dev        # http://localhost:4321 (static pages only)
npm run preview    # build + run on the Cloudflare runtime, incl. /api/contact
npm run check      # type-check
```

## Contact form → n8n

1. In n8n, import **`n8n/website-contact-form.json`** (Workflows → Import from File). It has a **Webhook** trigger
   (POST `/webhook/website-contact`) and sends two Gmail messages: a notification to **iraideas@gmail.com**
   (Reply-To is the visitor) and a confirmation to the visitor (Reply-To tim@iraideas.com). Attach a Gmail
   credential to both Gmail nodes, then activate the workflow. The webhook receives JSON:
   ```json
   { "source": "home-quick-contact | contact-page", "name": "", "phone": "", "email": "", "message": "",
     "page": "", "submitted_at": "", "ip_country": "", "user_agent": "" }
   ```
   From there, send it to GHL, email, Slack, or wherever you like.
2. Put the URL in `wrangler.jsonc` → `vars.CONTACT_WEBHOOK_URL` (or set it in the Cloudflare dashboard).
3. Optional spam protection: create a Turnstile widget, put the **site key** in `TURNSTILE_SITE_KEY` (`src/data/site.ts`) and
   add the **secret** with `npx wrangler secret put TURNSTILE_SECRET`.

## Deploy to Cloudflare

Option A (recommended): connect the GitHub repo in **Cloudflare dashboard → Workers & Pages → Create → Import a repository**.
Use build command `npm run build` and deploy command `npx wrangler deploy`. Every push then deploys automatically.

Option B (from your machine):
```bash
npx wrangler login
npm run deploy
```

The first deploy goes to `ira-ideas.<your-account>.workers.dev`, so you can review it before touching the live domain.

> **Before pointing iraideas.com at the Worker:** the booking and funnel pages (`/retirement-certainty-session/`,
> `/private-strategy-session/`, etc.) still live on WordPress. Rebuild them, or move WordPress to a subdomain
> and update `BOOKING_URL`, before switching DNS. Otherwise those pages would 404.
