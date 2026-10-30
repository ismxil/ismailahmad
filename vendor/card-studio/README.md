# Embedded Card Studio

Source: https://github.com/ismxil/cardstudio, commit
`fc7e2835877cef10c5806c43733e1f9cb7e1107a` (`ismxil/shader-flow-design`).

This is the working Card Studio from the local development checkout. The
portfolio builds it with esbuild into `assets/card-studio/generated/` and serves
it in an iframe in Sterling's case study. Original card artwork and Youth font
are in `assets/card-studio/`; interface fonts come from `inter-ui`.

Integration changes: asset paths point to the embedded directory, reference
document links are omitted, and offscreen rendering pauses in response to the
parent page's same-origin visibility message. The original app checkout is
unchanged. PNG, PDF and JSON exports are generated locally in the browser.
