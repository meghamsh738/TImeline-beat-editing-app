# Timeline Builder (fastfx)

A desktop-style timeline prototype built with React + Vite. Features snapping (markers/edges/gaps), ripple moves/trims, loop ranges, asset ingest with waveforms/thumbs, zoom/pan controls, and export presets. Playwright smoke tests ship with recorded video/screenshot outputs.

Quick start
- `cd web`
- `npm install`
- `npm run dev -- --host --port 4178` then open http://localhost:4178

Captures (see `web/screenshots/`)
- Edit overview: `web/screenshots/edit-overview.png`
- Assets tab (with free sample image + tone): `web/screenshots/assets.png`
- Export tab: `web/screenshots/export.png`
- Run video: `web/screenshots/timeline-run.webm`

Tests & build (from `web/`)
- Smoke test + recording: `npm run test:e2e`
- Production build: `npm run build`
- Playwright browsers live in your Linux home cache (`~/.cache/ms-playwright`); if running from NTFS, set `PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright` to avoid chmod issues.

Sample media
Bundled free assets live in `web/public/samples/`. New truly-free examples:
- `free-tone-10s.wav` – 10s sine tone generated in-house (public domain)
- `mars-1280.jpg` – NASA/ESA Mars true-color image (public domain)
Legacy samples from Samplelib (mp4 / short wav / photo) remain for convenience. Use the Assets tab file picker or drag directly onto tracks.

More details
See `web/README.md` for feature notes, shortcuts, and file map.
