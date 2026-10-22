<div align="center">

<img src="icon128.png" alt="Clothwork logo" width="96" />

# CLOTHWORK

**A focused workspace for 2d clothing creators.**

**Website:** https://bordersz.github.io/clothwork/

`Chrome extension` · `JavaScript` · `Manifest V3` · `Local-first`

*Independent project. Not affiliated with Roblox Corporation.*

</div>

![Clothwork dashboard](docs/preview-demo.png)

<details><summary>See the floating Creator Dashboard panel</summary>

![Clothwork sidebar](docs/sidebar-demo.png)

</details>

## What is Clothwork?

Clothwork is a Chrome extension that helps organize classic Roblox shirts, pants and T-shirts. It verifies a group's identity, loads clothing, previews bulk name and description changes, shows a compact companion inside the Creator Dashboard, and keeps local activity/results.

**What the GitHub download does:** preview, organize, copy, and track changes to classic clothing. **The user saves each item in Roblox Creator Hub.** It does not bulk-edit metadata automatically, turn sales on/off, or archive Marketplace items.

## Features

- Check a group ID and load available clothing, or paste an individual Roblox clothing URL/asset ID without an API key.
- Choose **keep names**, **one name for selected items**, or **individual item names**.
- Prepare and preview descriptions with `{group}` and other supported placeholders.
- Preserve description paragraphs, preview expandable long text, and optionally add selected clothing tags from a fixed vocabulary.
- Filter shirts, pants, T-shirts; select items individually or in bulk.
- Inspect activity and results in a floating in-page panel.
- Switch between refined **dark and light themes**.
- Optional CSV/JSON exports (no automatic downloads); clear locally saved data.
- Review age-eligible items with clear links and instructions for **manual Marketplace archiving** in Roblox.
- Automatically show the dashboard companion on first visit, with a collapsible floating panel.
- Collapsible help and optional light/dark interface.
- 100-row inventory pagination and a single **Start editing** action.

## Install and use — free

**On Windows:** download the ZIP using GitHub's **Code → Download ZIP**, extract it, and open the extracted folders until you see `app.js` and `manifest.json` next to each other. In `chrome://extensions`, enable **Developer mode → Load unpacked**, then **select that entire folder**. `manifest.json` is a file, not a folder. See the [visual step-by-step explanation](docs/USER_GUIDE.md).

1. Download or clone the repository.
2. Open `chrome://extensions` in Google Chrome.
3. Turn **Developer mode** on.
4. Click **Load unpacked**, then choose the folder that contains `manifest.json`.
5. Open the [Creator Dashboard](https://create.roblox.com/dashboard/creations?activeTab=AvatarItems-classics&filterIndex=0). Click the small Clothwork button, then **Open editor**.
6. Enter a group ID and load shirts and pants, or add one clothing item by URL or asset ID. Choose a naming mode and select **Start editing**.
7. Use Copy name / Copy description for each item, save through Roblox Creator Hub, and mark the result as saved.

No paid website, OAuth registration, API key, or Chrome Web Store listing is required for the manual editing workflow. Clothwork prepares edits; each change must be saved through Roblox's own editor.

## API access and supported editing

This public release does **not** ask creators for API keys or attempt automatic account actions. Roblox's Creator Third-Party App Policy prohibits requesting other users' API keys. An officially registered OAuth integration would be needed for supported multi-user API editing. This release deliberately provides guided manual saves and archive instructions instead.

## Safety and privacy

The public build stores relevant inventory and operation state locally in Chrome for resuming and reports; it has no analytics, trackers or developer-operated servers. **Never publish passwords, cookies, or other credentials.** Review the [privacy policy](docs/PRIVACY.md), [architecture](docs/ARCHITECTURE.md), and [security notes](SECURITY.md).

Clothwork does not require third-party account access. Clothwork does not request credentials. Changes are saved by the user in Roblox's own editing interface.

For guided manual editing, follow the [user guide](docs/USER_GUIDE.md).

## Development

Requires Node.js 20+ for tests; the extension itself has **no npm dependencies**.

```bash
npm test
```

## Status

Version **0.7.3** — experimental. The interface and unit tests are locally testable. Roblox APIs and permissions may change; live operation with a real Roblox session is not certified by this repository. This is an independent project, not an official Roblox integration.

## Ownership

Copyright © 2026 Clothwork project author. All rights reserved. The source is available for review, not granted for unrestricted redistribution or commercial reuse. There is no open-source license at present.
