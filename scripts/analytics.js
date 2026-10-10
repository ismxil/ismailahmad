import { inject } from '@vercel/analytics';

// Only measure real visits to the public site, not local checks or previews.
if (['ismailahmad.com', 'www.ismailahmad.com'].includes(location.hostname)) {
    inject({
        mode: 'production',
        beforeSend(event) {
            const url = new URL(event.url);
            url.search = '';
            url.hash = '';
            return { ...event, url: url.toString() };
        },
    });
}
