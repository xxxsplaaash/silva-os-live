# Silva Studios AI Division OS v3.9.9

This cleaned replacement removes the failed chat experiment and pivots the app back to what it does well:
- Studio Pulse (Gemini-powered studio guidance, not chat)
- Prompt Generator
- Prompt Library
- Caption Engine
- Content Planner
- Gallery / Assets
- Home System expanded into a consistency reference system

## What changed
- Chat experiment removed from backend runtime.
- Studio Pulse now uses `/api/studio/pulse`.
- Home System is treated as a reference/consistency engine for rooms, outfits, and unique items.
- Item refs are selective and should never be forced into every generation.

## Quick start

```bash
npm run setup:all
npm start
```

`setup:all` uses `npm ci --omit=dev` when `package-lock.json` exists and writes a local `.runtime/deps.hash` marker. Existing dependencies are reused until the lockfile changes.

For browser accessibility tests during development:

```bash
npm install
npm run setup:browsers
npm run test:a11y
```

You can also double-click `Launch Silva OS.command` on macOS; it runs the deterministic setup check before starting the server.

## Verification commands

```bash
npm run setup:all
npm test
npm install
npm run setup:browsers
npm run test:a11y
```

`setup:all` intentionally installs release dependencies with `--omit=dev`. Run `npm install` before Playwright accessibility work if dev dependencies were pruned.

## Notes
- Keep your local `.env` file.
- Keep your local `data/` folder if you want to preserve SQLite content.
- `.runtime/` is local runtime state and should not be committed.
