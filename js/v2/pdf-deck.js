// The portfolio deck at pdf.ismailahmad.com. One entry per PDF page, in
// order; images come from scripts/render-pdf.sh. Links are the PDF's own
// link annotations, as percentages of the slide, so they stay clickable.
export const deck = {
    title: "Ismail Ahmad — Portfolio '26",
    pdf: '/api/case-access?slug=portfolio&asset=pdf',
    slides: [
        { title: 'Portfolio', links: [{ href: 'https://www.ismailahmad.com', x: 87.25, y: 1.57, w: 11.15, h: 5.93 }] },
        { title: 'My experience' },
        { title: 'Principles' },
        { title: 'Lemfi', links: [{ href: 'https://lemfi.com/en-us/credit', x: 86.2, y: 2.96, w: 10.58, h: 5.93 }] },
        { title: 'Lemfi — Context' },
        { title: 'Lemfi — Design system' },
        { title: 'Lemfi — Conclusion' },
        { title: 'Lemfi — Website' },
        { title: 'Lemfi — Website' },
        { title: 'Motel One — Digital Key & Check-in', links: [{ href: 'https://www.motel-one.com/en/services/be-one-membership-programme/quick-check-in-mobile-key/', x: 85.83, y: 2.31, w: 11.67, h: 6.2 }] },
        { title: 'Motel One — Context' },
        { title: 'Motel One — Result' },
        { title: 'Motel One — Blueprint & constraints' },
        { title: 'Motel One — Online check-in' },
        { title: 'Motel One — Digital key' },
        { title: 'Etihad Credit Bureau — Web & Portal Design' },
        { title: 'Etihad Credit Bureau — Context' },
        { title: 'Etihad Credit Bureau — Information architecture' },
        { title: 'Etihad Credit Bureau — Components' },
        { title: 'gomoney', links: [{ href: 'https://gomoney.global/home', x: 85.83, y: 2.31, w: 11.67, h: 6.2 }] },
        { title: 'gomoney — Context' },
        { title: 'gomoney — Onboarding flow' },
        { title: 'gomoney — Website' },
        { title: 'Cadana', links: [{ href: 'https://cadanapay.com/', x: 85.83, y: 2.31, w: 11.67, h: 6.2 }] },
        { title: 'Cadana — Context' },
        { title: 'Cadana — Brand' },
        { title: 'Biscons' },
        { title: 'FoMA' },
        { title: 'Salarify' },
        { title: 'Impact' },
        { title: 'More…' },
        { title: 'Thank you', links: [{ href: 'https://www.ismailahmad.com', x: 87.25, y: 1.57, w: 11.15, h: 5.93 }] },
    ],
};

const pad = n => String(n).padStart(2, '0');
export const slideSrc = n => `/api/case-access?slug=portfolio&asset=slides/${pad(n)}.webp`;
export const thumbSrc = n => `/api/case-access?slug=portfolio&asset=thumbs/${pad(n)}.webp`;
