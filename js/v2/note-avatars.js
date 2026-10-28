// Small, self-contained illustrations shared by the note editor and email.
export const NOTE_AVATARS = [
    { id: 'sunny', label: 'Sunny', background: '#e8bd65', detail: 'smile' },
    { id: 'mint', label: 'Mint', background: '#8fbd9d', detail: 'glasses' },
    { id: 'sky', label: 'Sky', background: '#8eb8e8', detail: 'wave' },
    { id: 'lilac', label: 'Lilac', background: '#c8addb', detail: 'curl' },
    { id: 'peach', label: 'Peach', background: '#e9ad94', detail: 'freckles' },
    { id: 'night', label: 'Night', background: '#5c617c', detail: 'smile' },
];

export function noteAvatarSVG(avatar) {
    const details = {
        smile: '<path d="M13 15q7-10 14 0" fill="#4a3f1a" stroke="none"/>',
        glasses: '<g fill="none"><circle cx="16" cy="21" r="4"/><circle cx="25" cy="21" r="4"/><path d="M20 21h1"/></g>',
        wave: '<path d="M12 17q-2-8 6-8 0 7 8 3l3 6" fill="#4a3f1a" stroke="none"/>',
        curl: '<path d="M11 17q-4-6 2-8 1-6 7-3 6-3 9 3 6 2 2 9l-4-4-4 2-4-3-4 4Z" fill="#4a3f1a" stroke="none"/>',
        freckles: '<g fill="#ba734e" stroke="none"><circle cx="13" cy="25" r="1"/><circle cx="16" cy="26" r="1"/><circle cx="25" cy="26" r="1"/><circle cx="28" cy="25" r="1"/></g>',
    };
    return `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="${avatar.background}"/><path d="M7 39q0-12 13-12t13 12" fill="#fff7d6"/><ellipse cx="20" cy="20" rx="10" ry="12" fill="#ffe4bd"/><g stroke="#4a3f1a" stroke-width="1.4" stroke-linecap="round"><path d="M16 20v1m9-1v1m-8 5q3 3 6 0"/>${details[avatar.detail]}</g></svg>`;
}
