#!/usr/bin/env bash
set -euo pipefail
TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "Usage: bash apply_v395_replace.sh /path/to/silva-os"
  exit 1
fi
if [[ ! -d "$TARGET" ]]; then
  echo "Target not found: $TARGET"
  exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TARGET/.v395_replace_backup/$STAMP"
for f in index.html server.js studio_pulse_v395.js package.json package-lock.json README.md; do
  [[ -f "$TARGET/$f" ]] && cp "$TARGET/$f" "$TARGET/.v395_replace_backup/$STAMP/" || true
done
[[ -d "$TARGET/routes" ]] && cp -R "$TARGET/routes" "$TARGET/.v395_replace_backup/$STAMP/routes" || true
[[ -d "$TARGET/db" ]] && cp -R "$TARGET/db" "$TARGET/.v395_replace_backup/$STAMP/db" || true

mkdir -p "$TARGET/routes" "$TARGET/db"
cp "$SCRIPT_DIR/index.html" "$TARGET/index.html"
cp "$SCRIPT_DIR/server.js" "$TARGET/server.js"
cp "$SCRIPT_DIR/studio_pulse_v395.js" "$TARGET/studio_pulse_v395.js"
cp "$SCRIPT_DIR/package.json" "$TARGET/package.json"
cp "$SCRIPT_DIR/package-lock.json" "$TARGET/package-lock.json"
cp "$SCRIPT_DIR/README.md" "$TARGET/README.md"
cp "$SCRIPT_DIR/routes/"*.js "$TARGET/routes/"
cp "$SCRIPT_DIR/db/"*.js "$TARGET/db/"
chmod +x "$TARGET/apply_v395_replace.sh" 2>/dev/null || true

echo "Applied Silva OS v3.9.5 replacement to $TARGET"
echo "Your local .env and any existing data/ remain untouched."
