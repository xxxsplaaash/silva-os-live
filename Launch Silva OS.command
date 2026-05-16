#!/bin/zsh
set -u

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR" || exit 1

echo "Silva OS dependency check..."
if ! npm run setup:all; then
  echo ""
  echo "Launch stopped because dependency setup failed."
  echo "Try deleting node_modules and .runtime/deps.hash, then run npm run setup:all again."
  echo "No API keys or .env values were printed."
  exit 1
fi

echo ""
echo "Starting Silva OS..."
npm start
