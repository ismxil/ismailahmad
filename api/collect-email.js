/**
 * Server-side Google Forms lead proxy for Stay in touch.
 * Browser never hits docs.google.com (no-cors opaque success lied when Forms returned 400).
 *
 * POST /api/collect-email  { "email": "...", "source"?: "..." }
 *
 * Requires the Google Form to accept anonymous responses:
 * Settings → Responses → Collect email addresses = Off (or Responder input),
 * and the form must not be restricted to a Google Workspace domain.
 * The Email question must NOT use Number response validation (that rejects emails).
 */

const GOOGLE_FORM_ACTION =
  'https://docs.google.com/forms/d/e/1FAIpQLSdp854JJq-73BaqUVWKVk-HqjY-VcaaKqxAaa5KYs3aN7EiSA/formResponse';
const GOOGLE_FORM_EMAIL_ENTRY = 'entry.482350635';
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

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    email = String(body.email || '').trim().toLowerCase();
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid request' });
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address' });
  }

  const params = new URLSearchParams();
  params.set(GOOGLE_FORM_EMAIL_ENTRY, email);
  params.set('fvv', '1');
  params.set('pageHistory', '0');
  params.set('submissionTimestamp', '-1');

  const controller = new AbortController();
  const timeout = setTimeout(function () {
    controller.abort();
  }, 10000);

  try {
    const googleRes = await fetch(GOOGLE_FORM_ACTION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (compatible; ismailahmad.com/1.0; +https://ismailahmad.com)'
      },
      body: params.toString(),
      redirect: 'follow',
      signal: controller.signal
    });

    const text = await googleRes.text();
    const ok = isGoogleFormAccepted(googleRes.status, text);

    if (!ok) {
      return res.status(502).json({
        ok: false,
        error:
          'Could not save your email. In Google Form settings: turn off “Collect email addresses” (Verified), remove domain restriction, and remove Number response validation on the Email question (use Text → Email, or no validation).'
      });
    }

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({
      ok: false,
      error: 'Could not reach the form. Please try again.'
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Google returns 200 on success (confirmation HTML). Success copy varies by locale
 * (EN / DE / …). Confirmation pages often still embed FB_PUBLIC_LOAD_DATA_, so that
 * alone must NOT be treated as failure.
 *
 * Reject only clear bounce signals: non-2xx, validation-failed, sign-in wall.
 */
function isGoogleFormAccepted(status, html) {
  if (status < 200 || status >= 300) return false;

  const lower = String(html || '').toLowerCase();

  if (
    lower.includes('data-validation-failed="true"') ||
    lower.includes('data-sign-in-to-continue="true"')
  ) {
    return false;
  }

  // Positive confirmation signals (any locale / markup variant).
  if (
    lower.includes('your response has been recorded') ||
    lower.includes('your response has been submitted') ||
    lower.includes('response has been recorded') ||
    lower.includes('response has been submitted') ||
    lower.includes('antwort wurde erfasst') ||
    lower.includes('antwort wurde gesendet') ||
    lower.includes('submit another response') ||
    lower.includes('weitere antwort senden') ||
    lower.includes('freebirdformviewerviewresponseconfirmationmessage')
  ) {
    return true;
  }

  // 2xx without an explicit bounce → accept. Google confirmation shells vary;
  // requiring phrase matches caused false 502s when FB_PUBLIC was still present.
  return true;
}
