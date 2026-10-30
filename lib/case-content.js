/** Shared projection for public content and authenticated protected content. */
export const caseFields = `
    "slug": slug.current, name, headline, lede, url, role, years, type, scope, industry,
    "locked": coalesce(requiresAccessCode, false),
    "hasPreview": coalesce(hasPublicPreview, false),
    "cover": cover.asset->url, "hero": hero.asset->url, "heroVideo": heroVideo.asset->url,
    "rotatingCovers": rotatingCovers[].asset->url,
    "coverVideo": coverVideo.asset->url,
    blocks[]{_key,type,label,body,alt,note,summary,aspectRatio,objectFit,"src":image.asset->url,"video":video.asset->url,
        images[]{"src":coalesce(asset->url, poster.asset->url),"video":video.asset->url,alt,aspectRatio,objectFit},
        items[]{quote,name,role,"avatar":avatar.asset->url},
        metrics[]{value,title,text,accent,"icon":icon.asset->url},
        actions[]{label,href}
    }
`;

/** A protected case exposes only the information needed for its public card. */
export function publicCase(item) {
    if (!item.locked) return item;
    const fields = ['slug', 'name', 'headline', 'cover', 'coverVideo', 'rotatingCovers', 'years', 'type', 'hasPreview'];
    return { ...Object.fromEntries(fields.filter(key => item[key] != null).map(key => [key, item[key]])), locked: true };
}

/** Only an explicitly configured prefix is public; never return the gated tail. */
export function publicPreview(item) {
    if (!item.previewEndKey || !Array.isArray(item.blocks)) return null;
    const end = item.blocks.findIndex(block => block._key === item.previewEndKey);
    if (end < 0) return null;
    const fields = ['slug', 'name', 'headline', 'lede', 'role', 'years', 'type', 'scope', 'industry', 'cover', 'hero', 'heroVideo'];
    return {
        ...Object.fromEntries(fields.filter(key => item[key] != null).map(key => [key, item[key]])),
        blocks: item.blocks.slice(0, end + 1), locked: true, preview: true,
    };
}
