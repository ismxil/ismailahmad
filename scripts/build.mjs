import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('js/generated', { recursive: true });
await build({
    entryPoints: { analytics: 'scripts/analytics.js', 'post-body': 'js/v2/post-body.js' },
    outdir: 'js/generated', bundle: true, format: 'esm', minify: true,
    target: ['es2022'], define: { 'process.env.NODE_ENV': '"production"' },
});

// The embedded editor is built from its pinned source, with PDF export loaded
// only when requested. Its styles and keyboard controls live inside an iframe.
await rm('assets/card-studio/generated', { recursive: true, force: true });
await build({
    entryPoints: { editor: 'vendor/card-studio/main.ts' },
    outdir: 'assets/card-studio/generated', bundle: true, splitting: true,
    format: 'esm', minify: true, target: ['es2022'],
    loader: { '.woff2': 'file' },
    external: ['/assets/card-studio/*'],
    define: { 'process.env.NODE_ENV': '"production"' },
});

await rm('public', { recursive: true, force: true });
await mkdir('public');
for (const directory of ['assets', 'css', 'js', 'data']) {
    await cp(directory, `public/${directory}`, { recursive: true, filter: path => !path.endsWith('.DS_Store') && path !== 'assets/pdf' });
}
for (const file of await readdir('.')) {
    if (/\.(html|css|js|pdf)$/.test(file) && !['tailwind.config.js', 'middleware.js', 'portfolio.pdf'].includes(file)) {
        await cp(file, `public/${file}`);
    }
}
console.log('Static site and browser bundles built in public/.');
