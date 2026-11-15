#!/usr/bin/env bash
# Compila, guarda en main, publica dist/ en gh-pages y avisa a Bing (IndexNow).
set -euo pipefail
cd "$(dirname "$0")"
node build.js
touch dist/.nojekyll
git add -A
git -c user.email=bot@talonlibre -c user.name=talonlibre-bot commit -qm "${1:-Actualización automática}

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" || true
git push -q origin HEAD:main
D=$(mktemp -d); cp -r dist/. "$D"; cd "$D"
git init -q -b gh-pages; git add -A 2>/dev/null
git -c user.email=bot@talonlibre -c user.name=talonlibre-bot commit -qm deploy
git push -q -f https://github.com/DAZUMYT/talonlibre.git gh-pages 2>&1 | grep -v '^remote' || true
cd - >/dev/null
for i in $(seq 1 30); do s=$(gh api repos/DAZUMYT/talonlibre/pages/builds/latest -q .status 2>/dev/null || echo x); [ "$s" = built ] && break; sleep 6; done
echo "Pages: $s"
node ping-indexnow.js
