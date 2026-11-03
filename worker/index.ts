/**
 * Cloudflare Worker for iraideas.com.
 *
 * Static pages are served straight from ./dist (see wrangler.jsonc). This Worker only runs
 * for /api/* routes:
 *
 *   POST /api/contact  → validates the form and forwards it to the n8n webhook (CONTACT_WEBHOOK_URL)
 */

interface Env {
  ASSETS: Fetcher;
  /** n8n webhook that receives contact-form submissions. */
  CONTACT_WEBHOOK_URL: string;
  /** Optional: Cloudflare Turnstile secret. When set, a valid token is required. */
  TURNSTILE_SECRET?: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function handleContact(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  // Honeypot: bots fill hidden fields. Pretend success so they don't retry.
  if (str(body.company_website, 200)) return json({ ok: true });

  const submission = {
    source: str(body.source, 50) || 'website',
    name: str(body.name, 200),
    phone: str(body.phone, 50),
    email: str(body.email, 254),
    message: str(body.message, 2000),
    page: str(body.page, 500),
    submitted_at: new Date().toISOString(),
    ip_country: request.headers.get('CF-IPCountry') ?? '',
    user_agent: str(request.headers.get('User-Agent'), 300),
  };

  if (!EMAIL_RE.test(submission.email)) return json({ error: 'Please enter a valid email address.' }, 400);
  if (!submission.message) return json({ error: 'Please enter a message.' }, 400);

  if (env.TURNSTILE_SECRET) {
    const token = str(body['cf-turnstile-response'], 2048);
    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', token);
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) form.append('remoteip', ip);
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const outcome = (await verify.json()) as { success: boolean };
    if (!outcome.success) return json({ error: 'Spam check failed. Please try again.' }, 400);
  }

  if (!env.CONTACT_WEBHOOK_URL) {
    console.error('CONTACT_WEBHOOK_URL is not configured');
    return json({ error: 'The contact form is not configured yet.' }, 503);
  }

  const res = await fetch(env.CONTACT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  });
  if (!res.ok) {
    console.error('Contact webhook failed', res.status, await res.text().catch(() => ''));
    return json({ error: 'Sorry, we couldn’t send your message.' }, 502);
  }
  return json({ ok: true });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      return handleContact(request, env);
    }

    if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
