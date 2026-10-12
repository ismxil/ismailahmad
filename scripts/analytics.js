import { inject } from '@vercel/analytics';

// Only measure real visits to the public site, not local checks or previews.
if (['ismailahmad.com', 'www.ismailahmad.com'].includes(location.hostname)) {
    inject({
        mode: 'production',
        beforeSend(event) {
            const url = new URL(event.url);
            // Campaign tags are the only query worth keeping: they are how a
            // newsletter click is told apart from a search hit. Everything
            // else is dropped so no stray parameter is ever recorded.
            const campaign = new URLSearchParams();
            for (const [key, value] of url.searchParams) {
                if (key.startsWith('utm_')) campaign.set(key, value);
            }
            url.search = campaign.toString();
            url.hash = '';
            return { ...event, url: url.toString() };
        },
    });
}
