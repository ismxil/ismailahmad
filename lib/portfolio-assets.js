import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

export function portfolioAssetPath(asset) {
    if (asset === 'pdf') return 'assets/pdf/ismail-ahmad-portfolio.pdf';
    if (/^(slides|thumbs)\/(0[1-9]|[12][0-9]|3[0-2])\.webp$/.test(asset)) return `assets/pdf/${asset}`;
    return null;
}

export async function servePortfolioAsset(asset, res) {
    const path = portfolioAssetPath(asset);
    if (!path) return res.status(404).json({ error: 'File unavailable.' });
    const file = resolve(path);
    const info = await stat(file);
    res.setHeader('Content-Type', asset === 'pdf' ? 'application/pdf' : 'image/webp');
    res.setHeader('Content-Length', String(info.size));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (asset === 'pdf') res.setHeader('Content-Disposition', 'attachment; filename="ismail-ahmad-portfolio.pdf"');
    // Stream the download instead of buffering the entire PDF in the response.
    return new Promise((resolve, reject) => {
        const stream = createReadStream(file);
        stream.on('error', reject);
        res.on('finish', resolve);
        res.on('close', () => { stream.destroy(); resolve(); });
        stream.pipe(res);
    });
}
