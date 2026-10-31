// Home is always a four-card preview. The badge counts the entire published
// collection, and Work displays that entire collection in the same CMS order.
export function selectWork(cases, preview = false) {
    return { visible: preview ? cases.slice(0, 4) : cases, total: cases.length };
}
