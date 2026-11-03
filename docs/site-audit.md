# iraideas.com — Site Audit (pre-rebuild)

Crawled 2026-11-03 from the live site: all 49 pages and 52 posts in the Yoast sitemaps, plus rendered
screenshots and computed styles of the main pages. Reference screenshots are in [`reference/`](reference/).

---

## 1. How it's built

| Layer | What's used |
|---|---|
| CMS | WordPress 7.1.4 |
| Theme | **Blocksy 2.1.44** + Blocksy Companion (header, footer, blog/post templates) |
| Page builder | **Elementor 4.3.6** + Happy Elementor Addons (main marketing pages) |
| Forms | Forminator (Quick Contact on home, Contact page form) |
| Testimonials | "Testimonial Free" (Swiper slider) |
| Blog grid | Content Views (Query and Display Post/Page) |
| SEO | Yoast SEO (sitemaps, titles, meta descriptions) |
| Payments | Stripe **and** Square (sandbox CDN still loaded) on booking pages |
| Booking | Custom booking calendar + `/sessions-dashboard/`, `/manage-booking/` |
| Icons | Font Awesome 4 + 5, eicons, fontello (several overlapping icon sets) |
| Fonts | Google Fonts (Roboto, Roboto Slab, Inter, Playfair Display, Roboto Condensed) + Bunny Fonts |
| Credit | Footer: "Designed & Powered by AireProKit" |

The pages use three different design systems:
1. **Elementor marketing pages** (Home, About, Videos, Contact): dark teal and amber, in Roboto, Georgia and Inter.
2. **Booking funnel pages** (Retirement Certainty Session, Private Strategy Session, …): hand-coded HTML in Playfair Display and Inter, with their own `--ira-*` CSS variables.
3. **Blog posts and old content pages**: stock Blocksy defaults (system font, blue `#2872fa` links). These are off-brand.

---

## 2. Navigation

**Header** (sticky, dark teal `#003A3A`, 91px tall; logo `IRALOGO3.png`, amber "IRA" with white "IDEAS LLC")

| Label | Target |
|---|---|
| Home | `/` |
| Services | `#services` (anchor on home) |
| About | `/about-tim-berry/` |
| Videos | `/videos-ira-401k/` |
| Contact | `/get-in-touch-ira-401k-attorney/` |
| **Book An Appointment** (amber block button, far right) | `/retirement-certainty-session/` |

**Footer** (`#0B1B23`, rounded top corners)
- Logo + tagline: *"Providing clear legal guidance and education on self-directed IRAs and 401(k)s to help you invest confidently and stay compliant."*
- **Get In Touch**: 2473 S Higley, 104-117 Gilbert, AZ 85295 · tim@iraideas.com · 602-900-1855 · Privacy Policy
- "Book An Appointment →" button
- © 2026 IRA IDEAS LLC

Every main page ends with the same **CTA band** above the footer: a dark `#333` rounded card on a `#E7E7E7` strip.
Heading: "Take the First Step Toward **Smarter Retirement Investing**", with the second line in amber, then the Book button.

---

## 3. Page inventory

### A. Core pages (in the nav) — rebuild
| URL | Content |
|---|---|
| `/` | Hero ("Self Directed IRA & self-directed 401K Attorney.", Tim's photo, client avatars "Clients All Across the Country"), Quick Contact form, 2 feature badges (Prohibited Transactions / 5500ez issues), **"I specialize in assisting clients with:"** 4 service cards (Prohibited Transaction Analysis, Rollover Error Resolution, Reporting Error Connection, Retirement Estate Planning Strategy), About Me teaser, 3 videos, FAQ accordion, testimonials, CTA band |
| `/about-tim-berry/` | Hero "TIM BERRY" (attorney since 1997, licensed in WA, bills by project), "Translating the complexities…", services cards, 5-question FAQ, "What People Say" testimonial slider, CTA |
| `/videos-ira-401k/` | Banner + grid of **20 YouTube videos** ("Watch Full Video") |
| `/get-in-touch-ira-401k-attorney/` | Banner, "This isn't my first rodeo…", address/email/phone, contact form (180-char message) |
| `/retirement-certainty-session/` | Long sales and booking page: $125 / up to 15 min session vs. $950 Private Strategy Session, "Who this is for", "The Solution", testimonials, 400% guarantee, booking calendar + payment |
| `/privacy-policy/` | Legal text (2.1k words) |

### B. Booking and funnel pages — rebuild depends on the booking decision
`/private-strategy-session/` (3.6k words, $950), `/register-pay-advanced-401k-planning-session/`,
`/advanced-401k-session-event-terms/`, `/events/`, `/live/`, `/implementation-check-in/`,
`/private-planning-priority-list/`, `/72-hours-early-confirmation/`, `/payment-confirmed/`,
`/payment-confirmed-ira/`, `/planning-thank-you/`, `/manage-booking/` (noindex), `/sessions-dashboard/`

### C. Older content pages — migrate the content and restyle on-brand
`/self-directed-ira/`, `/self-directed-401k/`, `/fix-ira-rollover-problems/` (1.4k words),
`/converting-your-ira-to-a-self-directed-ira/`, `/ira-estate-planning/`, `/asset-protection-of-inherited-iras/`,
`/ira-plan/`, `/blog/` (post listing)

### D. Blog — 52 posts (most recent update July 2025), 3 categories, 46 tags
Topics include IRS levies, prohibited transactions, rollovers and 60-day fixes, Roth 401k conversions,
inherited IRAs and bankruptcy, and self-directed IRA LLCs. All posts keep their URLs (`/slug/`) for SEO.
Categories: `professional`, `retail`, `uncategorized`.

### E. Probably safe to drop (old, test, duplicate or empty) — confirm with the owner
`/sample-page/`, `/test/`, `/quickbooks-payment-test/`, `/elementor-5970/` ("Zaki"), `/elementor-8804/`,
`/home/`, `/homev2/`, `/landingpage/`, `/about-us/`, `/tim-berry/`, `/contact-me/`, `/videos-2/`,
`/basic-self-directed-ira-education/`, `/sa2023/`, `/latam-tax-solutions/`, `/vero/` ("Vida Nueva!"),
`/newsletter/`, `/appointments/`, `/professional/`, and empty pages `/create-a-401k/`,
`/estate-planning-for-your-ira/`, `/using-your-ira/`.
→ Old URLs that have traffic should get **301 redirects** (Cloudflare `_redirects`).

---

## 4. Color palette (what the site actually renders)

### Brand colors
| Token | Hex | Where it's used |
|---|---|---|
| Deep Teal | `#003A3A` | Header, home and about hero backgrounds, booking-page top bar |
| Dark Teal | `#0C4342` | Quick Contact card, FAQ accordion headers, cards |
| Teal | `#166863` | Eyebrow labels ("ABOUT ME", "FAQS") |
| Teal (mid) | `#256B64` / `#1A6B5A` | Secondary accents, booking cards |
| Teal (light) | `#489B9B` | Header base layer, mostly hidden under `#003A3A` |
| **Amber (primary accent)** | **`#FFB400`** | All CTA buttons, highlighted heading words, active nav, link hover, icons |
| Amber Hover | `#E6A200` | Button hover (booking pages) |
| Amber Deep | `#C47A00` | Booking card accent |

### Neutrals and dark surfaces
| Token | Hex | Where it's used |
|---|---|---|
| Footer Navy | `#0B1B23` | Footer |
| Slate Dark | `#16262D` / `#14242B` / `#1A2A31` | "I specialize…" section overlay |
| Deep Green-Slate | `#103034` | Testimonial section (booking page) |
| Charcoal | `#333333` / `#1C1C1C` | CTA band card |
| Ink | `#2D3A42` | Body text (booking pages) |
| Ink Soft | `#55646C` | Secondary text (booking pages) |
| Body Gray | `#494949` | Paragraph text (Elementor pages) |
| Muted Gray | `#7A7A7A` | Paragraph text, descriptions |
| Card Gray | `#E7E7E7` / `#EEEEEE` | Service cards, CTA strip |
| Line | `#E2E5E9` / `#CCCCCC` | Borders |
| Soft BG | `#F5F6F8` | Light section backgrounds |
| White | `#FFFFFF` | |

### Leftover defaults (not part of the brand; don't carry over)
- Blocksy palette: `#2872fa` / `#1559ed` blues (blog links and buttons), `#3A4F66`, `#192a3d`
- Elementor kit defaults: `#6EC1E4`, `#61CE70`, `#54595F`, `#4054B2`

---

## 5. Typography

| Role | Font | Weight | Size (desktop) | Notes |
|---|---|---|---|---|
| Nav links | **Roboto Condensed** | 700 | 15px | UPPERCASE, white → amber on hover/active |
| Hero H1 ("Self Directed IRA…") | **Georgia** | 700 | 73px | White plus amber words. CSS is `"Georgia", Sans-serif`, so it renders as serif Georgia on Mac/Windows |
| Section headings | Georgia | 400–600 | 35–48px | e.g. "I specialize in…", "I know the ins and outs…" |
| CTA band heading | **Inter** | 800 | 70px | "Take the First Step Toward…" |
| Card titles | Roboto / Georgia | 600–700 | 17–18px | |
| Body | **Roboto** | 400 | 16px | `#7A7A7A` / `#494949`, line-height ~1.65 |
| Eyebrow labels | Roboto | 600 | 14–17px | UPPERCASE, teal `#166863` or white |
| Buttons | Roboto | 500–600 | 14–15px | Amber fill, white text, trailing "→" |
| Booking-page headings | **Playfair Display** | 600–700 | — | Serif, editorial look |
| Booking-page body/UI | **Inter** | 400–600 | — | |
| Blog/posts | System font stack (Blocksy default) | 400 | 16px | Off-brand |

Roboto Slab is loaded on every page (Elementor kit default) but not visibly used.
In all, the site loads **6 font families at every weight (100–900, italics included)**, which is a large performance cost.

---

## 6. Design patterns to keep

- Dark teal hero with an angled or curved bottom edge, Tim's cut-out portrait on the right, amber highlighted words
- Floating **Quick Contact** card overlapping the hero
- Amber pill/rectangle buttons with "→"
- Dark section with a photo overlay holding a 4-up row of light-gray **service cards**, each with a "Book An Appointment →" link
- Overlapping two-photo collage next to the "About Me" copy
- Dark teal FAQ accordion
- Testimonial slider over a dark photo
- Rounded charcoal CTA band above a navy footer with rounded corners

## 7. Problems to fix in the rebuild

1. **Three inconsistent design systems.** Unify on one token set: teal, amber and neutrals.
2. **Font bloat.** 6 families at every weight. Trim to two or three families with only the weights used.
3. **Georgia falls back to sans-serif** on devices without it (Android, Linux), so the headline font varies by device.
4. **Blog and old pages are off-brand** (default Blocksy blue).
5. "Services" is an anchor link with no services page. (Videos looked blank during the audit only because YouTube was blocked in the audit sandbox.)
6. **Many test, duplicate and empty pages** are still published and indexed.
7. **Square sandbox** script is still loaded next to Stripe on booking pages.
8. **Heavy plugin JS/CSS**: about 45 stylesheets on the home page.
9. "Reporting Error **Connection**" should probably read "Correction".

## 7b. Integrations: n8n + GoHighLevel (keep as-is)

Booking, payments and automations run in **n8n** (`n8n.coreautomations.org`) and **GoHighLevel**.
The WordPress pages are only front ends: hand-coded HTML/JS that calls n8n webhooks directly from the browser.
The rebuild keeps **every webhook contract unchanged**, so no n8n or GHL changes are needed.

| Page | n8n webhooks called | Payment |
|---|---|---|
| `/retirement-certainty-session/` ($125) | `get-slots-ghl` (POST `{from_time, to_time, timezone:"America/Chicago"}` → `availableSlots`), `booking-ghl` | Stripe Elements (`pk_live_…`), `createPaymentMethod` in the browser, then charged in n8n |
| `/private-strategy-session/` ($950) | `pss-booking`, `pss-express`, `pss-verify-membership` | Stripe (live) |
| `/implementation-check-in/` | `checkin-slots`, `checkin-book` | — |
| `/private-planning-priority-list/` | `priority-list-signup` | — |
| `/register-pay-advanced-401k-planning-session/` | `35963c3b-…` | QuickBooks Payments (Intuit tokenization) |
| `/ira-plan/` | `71e92b34-…` | Square **sandbox** (test mode?) |
| `/self-directed-401k/` | `244c6d6b-…` | Square **sandbox** (test mode?) |
| `/live/` | `WEBHOOK_URL = "PASTE_YOUR_WEBHOOK_URL_HERE"` (**not wired up**) | — |
| `/test/`, `/quickbooks-payment-test/` | test webhooks | test |
| `/sessions-dashboard/`, `/manage-booking/` | rendered client-side (no static content) | — |

Booking rules hard-coded on the Retirement Certainty page: available days Mon/Tue/Thu, 9:30–15:00
(America/Chicago), 15-minute slots.

Tracking: **Meta (Facebook) Pixel** `1412106300370234` on pages. The domain is already proxied through Cloudflare
(email-obfuscation script present).

Open items: three payment processors are in use (Stripe, QuickBooks, Square sandbox). Confirm which are live.

## 8. Recommended rebuild approach (for Cloudflare)

- **Astro** static site → **Cloudflare Workers / Pages** (fast, cheap, good SEO)
- Content as Markdown/MDX (pages + 52 posts), keeping all current URLs
- Design tokens from section 4 and the typography above, as CSS variables
- Contact / Quick Contact forms → Cloudflare Pages Function + Turnstile + email delivery
- `_redirects` for retired URLs; sitemap + meta carried over from Yoast
- Booking and payments: owner decision needed (see open questions)

### Open questions for the owner
1. Booking and payments: keep a custom calendar + Stripe (Worker + D1), or use a hosted tool (Cal.com, Calendly + Stripe)?
2. Which pages in section 3E can be deleted, and which funnel pages (3B) are still in use?
3. Headline font: keep Georgia or switch to a web font (for example Playfair Display, already used on the booking pages) so it looks the same on every device?
4. Is there a newsletter or email list to connect?
