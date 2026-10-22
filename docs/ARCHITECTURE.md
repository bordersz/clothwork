# Architecture

- `manifest.json`: Manifest V3 registration, scope-limited host permissions, dashboard content script.
- `app.html`, `style.css`: editing dashboard; high-contrast dark/light themes.
- `app.js`: verified group lookup, listing pagination, read-only preview and validation, local checkpoints, reporting and controls.
- `core.js`: pure asset normalization, templating, ownership identification, 180-day archive estimate and CSV helpers.
- `widget.js`, `widget.css`: in-page shadow DOM companion on Creator Dashboard showing local progress, completed/failed counts, results and settings.
- `background.js`: editor tab management and status badges.
- `tests/core.test.mjs`: validation and planning tests, runnable with `npm test`.

## Processing pipeline

`Group ID -> verify group -> list classic items -> choose scope -> preview -> manual approval -> results`.

The public edition stops at preview. It provides a safe preview before manual editing.
All metadata updates are completed manually in Roblox Creator Hub.

## Trust boundary

Content scripts never receive API credentials. The panel only reads local status. The public edition contains no Open Cloud key handler or write host permission. User data is rendered as text rather than untrusted HTML.
