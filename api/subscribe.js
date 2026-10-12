/**
 * Subscribe proxy for Kit (kit.com), where the mailing list lives.
 *
 * The browser never carries the API key: it posts here, and this function
 * adds the subscriber to the configured Kit form. Kit then runs whatever
 * confirmation the form is set to — double opt-in leaves the subscriber
 * "inactive" until they click the email, which the reply reports back so
 * the page can say "check your inbox" rather than claiming success.
 *
 * POST /api/subscribe  { "email": "...", "source"?: "...", "referrer"?: "..." }
 *
 * Environment:
 *   KIT_API_KEY   v4 API key from kit.com → Settings → Developer
 *   KIT_FORM_ID   the form subscribers are added to
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KIT_API = 'https://api.kit.com/v4';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(204).end();
    }
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    let email = '';
    let source = 'website';
    let referrer = '';
    let trap = '';
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        email = String(body.email || '').trim().toLowerCase();
        if (body.source) source = String(body.source).trim().slice(0, 64);
        if (body.referrer) referrer = String(body.referrer).trim().slice(0, 500);
        trap = String(body.website || '').trim();
    } catch {
        return res.status(400).json({ ok: false, error: 'Invalid request' });
    }

    // Honeypot: a real person never fills a field they cannot see. Answer as
    // if it worked so a bot learns nothing from the difference.
    if (trap) return res.status(200).json({ ok: true, state: 'ignored' });

    if (!EMAIL_RE.test(email) || email.length > 254) {
        return res.status(400).json({ ok: false, error: 'Please enter a valid email address' });
    }

    const key = process.env.KIT_API_KEY;
    const form = process.env.KIT_FORM_ID;
    if (!key || !form) {
        return res.status(503).json({ ok: false, error: 'The newsletter is not connected yet. Please email me instead.' });
    }

    try {
        // Kit's form endpoint only accepts existing subscribers. Create new
        // readers as inactive so the form's confirmation flow stays in control.
        // This upsert preserves the state of existing subscribers.
        const created = await fetch(`${KIT_API}/subscribers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key },
            body: JSON.stringify({ email_address: email, state: 'inactive' }),
            signal: AbortSignal.timeout(8000),
        });
        if (!created.ok) {
            return res.status(created.status === 422 ? 400 : 502).json({
                ok: false,
                error: created.status === 422
                    ? 'That email address was not accepted. Please check it and try again.'
                    : 'Could not reach the newsletter just now. Please try again.',
            });
        }

        const response = await fetch(`${KIT_API}/forms/${encodeURIComponent(form)}/subscribers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key },
            // Kit keeps the referrer against the subscriber, which is how a
            // signup is traced back to the article that earned it.
            body: JSON.stringify({ email_address: email, referrer: referrer || undefined }),
            signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
            // Never surface Kit's body: it can echo the key's permissions.
            return res.status(response.status === 422 ? 400 : 502).json({
                ok: false,
                error: response.status === 422
                    ? 'That email address was not accepted. Please check it and try again.'
                    : 'Could not reach the newsletter just now. Please try again.',
            });
        }

        const data = await response.json().catch(() => ({}));
        // "inactive" means Kit has sent a confirmation email and is waiting.
        const state = data?.subscriber?.state === 'active' ? 'active' : 'pending';
        return res.status(200).json({ ok: true, state, source });
    } catch {
        return res.status(502).json({ ok: false, error: 'Could not reach the newsletter just now. Please try again.' });
    }
}
