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

## Notes
- Keep your local `.env` file.
- Keep your local `data/` folder if you want to preserve SQLite content.
