/**
 * Server-side Substack free-subscribe proxy.
 * Browser never hits wandarer.com (avoids CORS + _blank form dumps).
 *
 * POST /api/subscribe  { "email": "...", "source"?: "..." }
 */

const SUBSTACK_BASE = (process.env.SUBSTACK_URL || 'https://wandarer.com').replace(/\/$/, '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let email = '';
  let source = 'website';

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    email = String(body.email || '').trim().toLowerCase();
    if (body.source) source = String(body.source).trim().slice(0, 64);
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid request' });
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address' });
  }

  const headers = {
    Accept: 'application/json, text/plain, */*',
    'User-Agent':
      'Mozilla/5.0 (compatible; ismailahmad.com/1.0; +https://ismailahmad.com)',
    Origin: SUBSTACK_BASE,
    Referer: SUBSTACK_BASE + '/subscribe'
  };

  async function postToSubstack(contentType, body) {
    const controller = new AbortController();
    const timeout = setTimeout(function () {
      controller.abort();
    }, 8000);
    try {
      const substackRes = await fetch(SUBSTACK_BASE + '/api/v1/free' + (contentType.includes('urlencoded') ? '?nojs=true' : ''), {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': contentType }, headers),
        body: body,
        signal: controller.signal
      });
      return substackRes;
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    // JSON shape used by Substack's own subscribe page.
    const jsonRes = await postToSubstack(
      'application/json',
      JSON.stringify({
        email: email,
        first_url: SUBSTACK_BASE + '/',
        first_referrer: '',
        current_url: SUBSTACK_BASE + '/subscribe',
        current_referrer: '',
        referral_code: '',
        source: source || 'subscribe_page'
      })
    );

    if (jsonRes.ok) {
      return res.status(200).json({ ok: true });
    }

    // Fallback: form-urlencoded + nojs (older path some publications still accept).
    const formRes = await postToSubstack(
      'application/x-www-form-urlencoded',
      new URLSearchParams({
        email: email,
        source: source || 'subscribe_page'
      }).toString()
    );

    if (formRes.ok) {
      return res.status(200).json({ ok: true });
    }

    return res.status(502).json({
      ok: false,
      error: 'Could not complete subscription. Please try again.'
    });
  } catch {
    return res.status(502).json({
      ok: false,
      error: 'Could not reach the newsletter service. Please try again.'
    });
  }
}
