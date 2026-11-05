#!/bin/sh
# Pull the latest rueca kit (src/components/studio, rueca/) and the agent skill
# (.claude/skills/rueca). The billboard tool itself lives in src/tool and is
# never overwritten. Review the diff before committing.
set -e
cd "$(dirname "$0")/.."
npx -y shadcn@latest add https://rueca.dev/r/studio.json -y --overwrite
tmp=$(mktemp -d)
git clone --depth 1 --quiet https://github.com/rueca/rueca.git "$tmp/rueca"
rm -rf ../../.claude/skills/rueca
cp -R "$tmp/rueca/skills/rueca" ../../.claude/skills/rueca
echo "rueca skill updated to $(git -C "$tmp/rueca" rev-parse --short HEAD)"
rm -rf "$tmp"
npm run build
