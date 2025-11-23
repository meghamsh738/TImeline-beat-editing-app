# Timeline Builder (fastfx)

A desktop-style timeline prototype built with React + Vite. Features snapping (markers/edges/gaps), ripple moves/trims, loop ranges, asset ingest with waveforms/thumbs, zoom/pan controls, and export presets. Playwright smoke tests ship with recorded video/screenshot outputs.

Quick start
- `cd web`
- `npm install`
- `npm run dev -- --host --port 4178` then open http://localhost:4178

Captures (see `web/screenshots/`)
- Edit overview: `web/screenshots/edit-overview.png`
- Assets tab: `web/screenshots/assets.png`
- Export tab: `web/screenshots/export.png`
- Run video: `web/screenshots/timeline-run.webm`

Tests & build (from `web/`)
- Smoke test + recording: `npm run test:e2e`
- Production build: `npm run build`

Sample media
Bundled free assets live in `web/public/samples/` (5s mp4, 3s wav with waveform decode, photo). Use them via the Assets tab or drag directly onto tracks.

More details
See `web/README.md` for feature notes, shortcuts, and file map.
