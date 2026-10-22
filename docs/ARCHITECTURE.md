# Architecture

- `manifest.json`: Manifest V3 registration, scope-limited host permissions, dashboard content script.
- `app.html`, `style.css`: editing dashboard; high-contrast dark/light themes.
- `app.js`: verified group lookup, listing pagination, metadata preview and validation, local checkpoints, reporting and controls.
- `core.js`: pure asset normalization, templating, ownership identification, 180-day archive estimate and CSV helpers.
- `widget.js`, `widget.css`: in-page shadow DOM companion on Creator Dashboard showing local progress, completed/failed counts, results and settings.
- `background.js`: editor tab management and status badges.
- `tests/core.test.mjs`: validation and planning tests, runnable with `npm test`.

## Processing pipeline

`Group ID -> verify group -> list classic items -> choose scope -> preview -> manual approval -> results`.

The extension supports guided copying of metadata and manual saves through Roblox.
All metadata updates are completed manually in Roblox Creator Hub.

## Trust boundary

Content scripts never receive API credentials. The panel only reads local status. The extension contains no write API handler. User data is rendered as text rather than untrusted HTML.
