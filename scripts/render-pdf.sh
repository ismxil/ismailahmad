#!/bin/sh
# Renders the portfolio PDF into the slides pdf.ismailahmad.com shows.
#   sh scripts/render-pdf.sh path/to/portfolio.pdf
# Needs poppler (pdftoppm) and ImageMagick. After a re-render, check that
# data/pdf-deck.json still has one entry per page.
set -e
src="$1"
out=assets/pdf
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

pdftoppm -r 96 -png "$src" "$tmp/p"   # 1920×1080pt slides → 2560×1440px
rm -rf "$out/slides" "$out/thumbs"
mkdir -p "$out/slides" "$out/thumbs"
for png in "$tmp"/p-*.png; do
    n=$(basename "$png" .png | sed 's/^p-//')
    magick "$png" -quality 82 -define webp:method=6 "$out/slides/$n.webp"
    magick "$png" -resize 480x -quality 70 "$out/thumbs/$n.webp"
done
cp "$src" "$out/ismail-ahmad-portfolio.pdf"
ls "$out/slides" | wc -l | xargs echo "Slides rendered:"
