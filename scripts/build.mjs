import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('js/generated', { recursive: true });
await build({
    entryPoints: { analytics: 'scripts/analytics.js', 'post-body': 'js/v2/post-body.js' },
    outdir: 'js/generated', bundle: true, format: 'esm', minify: true,
    target: ['es2022'], define: { 'process.env.NODE_ENV': '"production"' },
});

await rm('public', { recursive: true, force: true });
await mkdir('public');
for (const directory of ['assets', 'css', 'js', 'data']) {
    await cp(directory, `public/${directory}`, { recursive: true, filter: path => !path.endsWith('.DS_Store') });
}
for (const file of await readdir('.')) {
    if (/\.(html|css|js|pdf)$/.test(file) && !['tailwind.config.js', 'middleware.js'].includes(file)) {
        await cp(file, `public/${file}`);
    }
}
console.log('Static site and browser bundles built in public/.');
