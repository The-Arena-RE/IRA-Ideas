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
  /** n8n production webhook for Tax Academy membership checks and live availability. Store as a Worker secret. */
  PSS_VERIFICATION_WEBHOOK_URL?: string;
  /** n8n production webhook for booking creation and booking-status checks. Store as a Worker secret. */
  PSS_BOOKING_WEBHOOK_URL?: string;
  /** Public Stripe publishable key (pk_test_... first, then pk_live_...). */
  PSS_STRIPE_PUBLISHABLE_KEY?: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const isAllowedPssWebhook = (value?: string): value is string => {
  if (!value) return false;
  try {
    const target = new URL(value);
    return target.protocol === 'https:' &&
      target.hostname === 'n8n.coreautomations.org' &&
      target.pathname.startsWith('/webhook/');
  } catch {
    return false;
  }
};

async function proxyPssWebhook(request: Request, target: string | undefined, maxBytes: number): Promise<Response> {
  if (!isAllowedPssWebhook(target)) {
    return json({ error: 'The Private Strategy Session integration is not configured.' }, 503);
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== requestUrl.origin) return json({ error: 'Forbidden.' }, 403);

  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.startsWith('application/json') && !contentType.startsWith('multipart/form-data')) {
    return json({ error: 'Unsupported request format.' }, 415);
  }

  const declaredLength = Number(request.headers.get('Content-Length') ?? 0);
  if (declaredLength > maxBytes) return json({ error: 'The submitted files are too large.' }, 413);

  let body: ArrayBuffer;
  try {
    body = await request.arrayBuffer();
  } catch {
    return json({ error: 'The request could not be read.' }, 400);
  }
  if (body.byteLength > maxBytes) return json({ error: 'The submitted files are too large.' }, 413);

  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Accept': 'application/json',
      },
      body,
      redirect: 'follow',
    });
    const responseBody = await upstream.arrayBuffer();
    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Private Strategy Session webhook proxy failed', error);
    return json({ error: 'The booking service is temporarily unavailable.' }, 502);
  }
}


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

    if (url.pathname === '/api/pss/config') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
      const stripeKey = env.PSS_STRIPE_PUBLISHABLE_KEY ?? '';
      return json({
        stripePublishableKey: /^pk_(test|live)_[A-Za-z0-9]+$/.test(stripeKey) ? stripeKey : '',
        membershipConfigured: isAllowedPssWebhook(env.PSS_VERIFICATION_WEBHOOK_URL),
        bookingConfigured: isAllowedPssWebhook(env.PSS_BOOKING_WEBHOOK_URL),
      });
    }

    if (url.pathname === '/api/pss/verification') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      let payload: Record<string, unknown>;
      try {
        payload = await request.clone().json();
      } catch {
        return json({ error: 'Invalid request.' }, 400);
      }
      if (!['verify_membership', 'get_availability'].includes(String(payload.action ?? ''))) {
        return json({ error: 'Unsupported verification action.' }, 400);
      }
      return proxyPssWebhook(request, env.PSS_VERIFICATION_WEBHOOK_URL, 64 * 1024);
    }

    if (url.pathname === '/api/pss/booking') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      const contentType = request.headers.get('Content-Type') ?? '';
      if (contentType.startsWith('multipart/form-data')) {
        let form: FormData;
        try {
          form = await request.clone().formData();
        } catch {
          return json({ error: 'Invalid booking submission.' }, 400);
        }
        if (form.get('action') !== 'create_booking') return json({ error: 'Unsupported booking action.' }, 400);
      } else if (contentType.startsWith('application/json')) {
        let payload: Record<string, unknown>;
        try {
          payload = await request.clone().json();
        } catch {
          return json({ error: 'Invalid booking-status request.' }, 400);
        }
        if (payload.action !== 'booking_status') return json({ error: 'Unsupported booking action.' }, 400);
      } else {
        return json({ error: 'Unsupported request format.' }, 415);
      }
      return proxyPssWebhook(request, env.PSS_BOOKING_WEBHOOK_URL, 13 * 1024 * 1024);
    }

    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      return handleContact(request, env);
    }

    if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
