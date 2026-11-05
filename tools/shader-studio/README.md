# Smiley shader studio

A layer-stack shader tool built on [rueca](https://github.com/rueca/rueca)
(MIT): an editable heart-eyed smiley on top of a generated pattern. It forks
rueca's Gradient studio and adds three layer types.

| Layer | Category | What it does |
|---|---|---|
| **Smiley** | Shape | The heart-eyed smiley as a vector shape. Every part is a knob: eye size, spacing, height and tilt; smile radius, thickness, height, how open it is, and the angle of its flat cut. Fills are solid, invert (flips the pattern under it) or outline, with an optional heartbeat or sway. Select it to drag, scale (corners), stretch the width or height (side handles) and rotate (top knob) on the canvas. Set **Shape → My SVG** to use your own SVG from **Document → Custom shape**. |
| **Op-art chevrons** | Fill | A pattern generator after screen-printed op-art posters. Two-ink zigzag stripes are wrapped on a sphere so they bunch up at its rim, and stepped into square cells for staircase edges and checkers. A bevel sliver and paper speckle complete the print. Stripes spin around the sphere in a seamless loop. |
| *(Smiley → Render: 3D)* | Shape | The same face, or your own SVG or text, extruded into a solid with rounded edges that spins in a seamless loop. **Inflate** puffs it up like a balloon. Materials: black gloss, chrome, glass, clay, pearl, toon, and screen dither (scanlines, Bayer 4×4 / 8×8, halftone dots, crosshatch, noise), whose light tone can be see-through. |
| **Text / SVG** (add menu → Shape, or **Text & SVG** in the left panel) | Shape | Drop an SVG in the left panel's **Text & SVG** section, or switch it to **Text** and type a line. Its **Style** block sets flat or 3D, material, dither pattern, colour, size, spin and rows for that layer. It becomes a distance field, so it draws crisp flat (outline included) or extruded in 3D. **Rows** tiles it down the frame, scrolling and flickering row by row. |
| **Dither** | Stylise | Turns everything below into 1-bit ink and paper, in any of the dither patterns. |
| **Glitch** | Finish | Bands that jump sideways and bright scan bars, re-rolled a few times a second. |
| **3D object** | 3D | A raymarched shape (sphere, torus, cube, capsule, heart, blob, twist, arc) in chrome, glass, clay, pearl or toon. It reflects or refracts the layers below. |

rueca's own layers also work in the stack: mesh gradient, warp, halftone,
grain, and the rest.

## Run

From the repo root:

```bash
npm run shader:install   # once
npm run shader           # http://localhost:5280
```

**Canvas** (right panel, with no layer selected) sets the artwork size: a
preset format (poster, square, story, landscape, billboard, A4), **Custom size**
in pixels, or **Fill window**. You can also drag the canvas's right edge, bottom
edge or corner to resize it (shift keeps the ratio). Patterns and shapes are
sized relative to the canvas height, so a look holds at any size.

**Background** (right panel, with no layer selected) is a solid colour or a linear or
radial gradient. Its **Pattern** buttons add op-art, mesh, gradient or dither
layers at the bottom of the stack.

**Zoom** with the controls in the bottom bar (−, a percentage menu, +), ⌘+ / ⌘−,
shift+1 (fit) and shift+0 (100%), or pinch / ⌘-scroll at the pointer. Once
zoomed, scroll or middle-drag to pan. Zoom only changes the view, never the
export.

Export (top right) renders PNG stills at the canvas size (or 2×, or 4K), seamless MP4 loops, and the
whole stack as one GLSL fragment shader. **Copy / Download smiley SVG** exports
the selected Smiley as a clean vector of two heart paths and one smile path,
built from the same numbers.

## Layout

- `src/tool/`: the smiley tool (the forked shell plus its additions). Edit here.
- `src/components/studio/`, `rueca/`: the rueca kit, installed from
  `https://rueca.dev/r/studio.json`. Treat it as vendored code.
- `src/tool/svg.ts`: the smiley as SVG. Its geometry mirrors `smileySDF` in `src/tool/codegen.ts`.
- `../../.claude/skills/rueca/`: the rueca agent skill, so coding agents in this
  repo build tools with the kit.

## Update rueca

```bash
npm run rueca:update     # from the repo root
```

This command re-adds the kit with `--overwrite`, refreshes the agent skill, and
rebuilds. `src/tool/` is never touched. Review the diff before you commit.

This tool is not part of the site build. `scripts/build.mjs` never copies
`tools/`, and `.vercelignore` keeps it out of uploads.
