# Studio Pulse Wix Embed Runbook

## Production iframe URL

Use this as the Wix `/studio-pulse` iframe target:

```text
https://silva-os-live.vercel.app/pulse-showcase?embed=1
```

`embed=1` tightens the outer spacing, lets the page grow inside Wix, and keeps the standalone `/pulse-showcase` page unchanged for direct visits.

## Recommended Wix iframe settings

- Width: 100 percent of the content column.
- Desktop starting height: 900 px.
- Mobile starting height: 960 px.
- Disable Wix frame borders and extra padding around the iframe.
- Keep Wix as the marketing wrapper only; Vercel owns the interactive room.
- If Velo is used for dynamic height, listen for `PULSE_HEIGHT` and set iframe height to the reported value plus a small buffer, for example 24 px.

## Messages from the iframe

Studio Pulse posts only safe operational state. It never posts user text, prompts, memory internals, raw social cues, provider payloads, raw diagnostics, API keys, or model output previews.

| Message | Direction | Payload |
|---|---|---|
| `PULSE_READY` | iframe to Wix | `height`, `mode`, `statusKnown`, `embed` |
| `PULSE_HEIGHT` | iframe to Wix | `height`, `mode`, `embed` |
| `PULSE_STATUS` | iframe to Wix | `activeEngine`, `aishaEngineConnected`, `persistenceConnected`, `persistenceMode` |
| `PULSE_TURN_STATE` | iframe to Wix | `runtimePhase`, `acceptedByPack1`, `fallbackCategory`, `activeEngine`, `persistenceConnected`, `roomMood`, `responseMode`, `tension`, `continuityPressure`, `roomMove` |
| `PULSE_ERROR` | iframe to Wix | safe `category`, safe display `message` |

## Optional messages Wix may send

Only send these from trusted Silva Studios or localhost development origins:

```js
iframeWindow.postMessage({ type: "PULSE_SET_MODE", mode: "continuity_breaker" }, "https://silva-os-live.vercel.app");
iframeWindow.postMessage({ type: "PULSE_RESET" }, "https://silva-os-live.vercel.app");
iframeWindow.postMessage({ type: "PULSE_PING" }, "https://silva-os-live.vercel.app");
```

Supported modes:

- `social_hierarchy_lab`
- `continuity_breaker`

## Minimal Velo height listener

```js
$w.onReady(function () {
  const iframe = $w("#studioPulseIframe");

  iframe.onMessage((event) => {
    const data = event.data || {};
    if (data.type !== "PULSE_HEIGHT" || typeof data.height !== "number") return;
    iframe.height = Math.max(720, Math.ceil(data.height + 24));
  });
});
```

## Launch smoke steps

1. Open `https://silva-os-live.vercel.app/pulse-showcase?embed=1` on desktop and mobile.
2. Confirm there is no horizontal overflow at mobile width.
3. Confirm runtime status reports A.I.S.H.A / Pack 1 and persistence connected.
4. Send a continuity claim and confirm the turn visibly progresses through streaming state.
5. Confirm the final turn state reports `Pack 1 accepted` when the runtime succeeds.
6. Contradict the claim and confirm the ledger shows active and superseded continuity rows when Pack 1 returns them.
7. In Wix preview, confirm `PULSE_HEIGHT` changes the iframe height after load and after a turn.
8. Confirm the safe held-turn copy appears for guard responses: `The room held that turn. Try again in a moment.`

## Repeatable CLI proof

Run against the local built Vercel artifact before deploy:

```bash
SILVA_API_BASE_URL=https://silva-backend-799875816242.us-central1.run.app npm run build:vercel
node scripts/smoke-pulse-showcase-local-iframe.mjs
```

Run after Vercel deploy:

```bash
FRONTEND_URL=https://silva-os-live.vercel.app/pulse-showcase?embed=1 \
BACKEND_URL=https://silva-backend-799875816242.us-central1.run.app \
node scripts/smoke-pulse-showcase-public.mjs
```
