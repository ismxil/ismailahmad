import { Resend } from 'resend';
import { NOTE_AVATARS } from '../js/v2/note-avatars.js';

const MAX_MESSAGE = 5000;
const WINDOW_MS = 15 * 60 * 1000;
// Best-effort per-instance throttling; the provider also enforces its quota.
const attempts = new Map();
const escape = value => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function throttled(ip) {
    const now = Date.now();
    if (attempts.size > 2000) {
        for (const [key, value] of attempts) if (now >= value.expires) attempts.delete(key);
        if (attempts.size > 2000) attempts.delete(attempts.keys().next().value);
    }
    let entry = attempts.get(ip);
    if (!entry || now >= entry.expires) {
        entry = { expires: now + WINDOW_MS, count: 0 };
        attempts.set(ip, entry);
    }
    return ++entry.count > 5;
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }
    const allowedOrigins = new Set(['https://www.ismailahmad.com', 'https://ismailahmad.com']);
    if (process.env.VERCEL_URL) allowedOrigins.add(`https://${process.env.VERCEL_URL}`);
    if (process.env.VERCEL_ENV !== 'production') {
        allowedOrigins.add('http://localhost:4391');
        allowedOrigins.add('http://localhost:4322');
        if (process.env.PORT) allowedOrigins.add(`http://localhost:${process.env.PORT}`);
    }
    if (!allowedOrigins.has(req.headers?.origin)) return res.status(403).json({ error: 'Please send your note from the website.' });

    let body;
    try {
        if (typeof req.body === 'string' && Buffer.byteLength(req.body) > 24000) return res.status(413).json({ error: 'Your note is too long.' });
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Could not read your note. Please try again.' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Could not read your note.' });
    if (body.website) return res.status(400).json({ error: 'Could not send your note.' });
    const { message, name = '', avatar = 'sunny', requestId } = body;
    const illustration = NOTE_AVATARS.find(item => item.id === avatar);
    if (typeof message !== 'string' || !message.trim() || message.length > MAX_MESSAGE || typeof name !== 'string' || name.length > 80 || /[\r\n\x00-\x1f]/.test(name) || !illustration || typeof requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId)) {
        return res.status(400).json({ error: 'Please write a note of up to 5,000 characters and a name of up to 80 characters.' });
    }
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_EMAIL_DOMAIN) return res.status(503).json({ error: 'Notes are unavailable just now. Please try again later.' });
    const ip = String(req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (throttled(ip)) {
        res.setHeader('Retry-After', '900');
        return res.status(429).json({ error: 'A few too many notes at once. Please try again in 15 minutes.' });
    }
    const sender = name.trim() || 'A visitor';
    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
            from: `Portfolio notes <hello@${process.env.RESEND_EMAIL_DOMAIN}>`,
            to: ['work@ismailahmad.com'],
            subject: `A portfolio note from ${sender}`,
            text: `From: ${sender}\nAvatar: ${illustration.label}\n\n${message.trim()}\n\nSent from https://www.ismailahmad.com/about`,
            html: `<div style="font:16px/1.6 Arial,sans-serif;color:#4a3f1a;max-width:560px;padding:28px;background:#fbe89c;border-radius:16px"><p><strong>${escape(sender)}</strong> left you a note.</p><p style="font-size:12px">Avatar: ${illustration.label}</p><div style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(message.trim())}</div><p style="margin-top:32px;font-size:12px">Sent from <a href="https://www.ismailahmad.com/about">your portfolio</a></p></div>`,
        }, { idempotencyKey: `portfolio-note/${requestId}` });
        if (error || !data?.id) {
            console.error('notes: email provider rejected the message', error?.name || 'missing_id');
            return res.status(502).json({ error: 'Could not send your note. Please try again.' });
        }
        return res.status(200).json({ ok: true });
    } catch {
        console.error('notes: email provider unavailable');
        return res.status(502).json({ error: 'Could not send your note. Please try again.' });
    }
}
