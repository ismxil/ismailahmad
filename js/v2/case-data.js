let pending;

/** Share one published collection per page between cards, case pages and Menu. */
export function getCases() {
    if (!pending) pending = fetch('/api/cases', { cache: 'no-store' })
        .then(async response => {
            const data = await response.json();
            if (!response.ok || !Array.isArray(data.cases)) throw new Error('Could not load case studies.');
            return data.cases;
        }).catch(error => { pending = null; throw error; });
    return pending;
}

export function caseAsset(src) {
    const value = String(src || '');
    if (!value) return '';
    if (/^https?:\/\//.test(value) || value.startsWith('/')) return value;
    return `/${value}`;
}
