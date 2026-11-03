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

The URLs match the WordPress site so search rankings carry over. The **booking/funnel pages are not rebuilt yet**:
"Book An Appointment" buttons link to the WordPress page set in `BOOKING_URL` (`src/data/site.ts`).

## Stack

- **Astro** (static HTML) + **Tailwind CSS v4**. Brand colours and fonts are set in `src/styles/global.css` (`@theme`).
- Self-hosted fonts: Roboto, Roboto Condensed, Inter, and Georgia headings (with Gelasio as a fallback for devices that lack Georgia).
- **Cloudflare Worker** (`worker/index.ts`) handles `POST /api/contact` and forwards submissions to an **n8n** webhook.
  All other routes are static files.
- `public/_redirects` sends old duplicate URLs to their new pages, and `public/_headers` sets security and caching headers.

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

1. In n8n, create a workflow with a **Webhook** trigger (POST), e.g. `https://n8n.coreautomations.org/webhook/website-contact`.
   It receives JSON:
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
