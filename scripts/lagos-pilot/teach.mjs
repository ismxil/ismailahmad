/*
 * Teacher pass: Gemini redraws each render frame in the Tiny Lagos painted style.
 *   GEMINI_API_KEY=… node scripts/lagos-pilot/teach.mjs <frames-dir> <style-dir> <out-dir> [mode=day]
 * Each frame is sent with the style references; the prompt says how to draw, never what to
 * draw (the lesson from tiny.london). Results land in out-dir with the same file names, and
 * failed calls are retried up to three times. GEMINI_IMAGE_MODEL overrides the model.
 */
import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';

const [frames, styles, out, mode = 'day'] = process.argv.slice(2);
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('Set GEMINI_API_KEY.');
const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
await mkdir(out, { recursive: true });

const LIGHT = {
    day: 'Lighting: warm late-afternoon sun from the upper left, soft navy-teal shadows, honey light on roof edges, a few subtle cyan edge lights and amber street lamps already glowing.',
    night: 'Lighting: deep blue night. The city is lit from within: amber street lamps along every road, warm lit windows, cyan edge lights on the taller buildings, headlights as small streaks. Unlit ground and roofs sink into blue shadow.',
}[mode];
const PROMPT = `You are redrawing image 1, a plain 3D render of a real place, as a hand-painted illustration in the exact style of the reference images that follow it.

FIDELITY COMES FIRST:
1. Draw exactly what the render shows, in the same positions, shapes and sizes, seen from the same camera. Every road, building footprint, sports ground and green area stays where it is.
2. Add nothing that is not in the render and remove nothing that is. Do not add towers, landmarks, water or roads.
3. Where the render shows little detail, keep the drawing just as plain. Flat ground stays flat ground.
4. Keep the full frame edge to edge, with no border, vignette, text, labels or logos.

HOW TO DRAW:
- Studio Ghibli-style background painting: fine dark ink outlines, cel-shaded planes, gouache and watercolour texture, as in the references.
- Buildings: weathered cream and white concrete walls with small windows, rust, terracotta, red and blue corrugated or tiled roofs. Match each building's footprint and height from the render.
- Green areas in the render become lush, rounded, hand-painted tree canopies and grass. Grey roads become slate-grey roads with faint lane markings; small yellow minibuses and cars may travel on them.
- Sports pitches stay bright green with white lines; running tracks stay terracotta.
- ${LIGHT}
- Output one square image the same size as image 1.`;

const inline = async path => ({ inline_data: { mime_type: 'image/png', data: (await readFile(path)).toString('base64') } });
const styleParts = await Promise.all((await readdir(styles)).filter(f => f.endsWith('.png')).sort().map(f => inline(`${styles}/${f}`)));

async function generate(frame) {
    const body = { contents: [{ parts: [{ text: PROMPT }, await inline(frame), ...styleParts] }], generationConfig: { responseModalities: ['IMAGE'] } };
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    const part = json.candidates?.[0]?.content?.parts?.find(p => p.inline_data || p.inlineData);
    if (!part) throw new Error('No image in response: ' + JSON.stringify(json).slice(0, 300));
    return Buffer.from((part.inline_data || part.inlineData).data, 'base64');
}

for (const name of (await readdir(frames)).filter(f => f.endsWith('.png')).sort()) {
    const target = `${out}/${name}`;
    if (await access(target).then(() => true, () => false)) { console.log('skip', name); continue; }
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const started = Date.now();
            await writeFile(target, await generate(`${frames}/${name}`));
            console.log(name, `${((Date.now() - started) / 1000).toFixed(0)}s`);
            break;
        } catch (error) {
            console.warn(name, `attempt ${attempt} failed:`, error.message);
            if (attempt === 3) console.warn(name, 'gave up');
        }
    }
}
