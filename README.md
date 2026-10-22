<div align="center">

<img src="icon128.png" alt="Clothwork logo" width="96" />

# CLOTHWORK

**A focused workspace for 2d clothing creators. #bringbackclassicclothingcreation**

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

**Clothwork is a browser-based clothing workspace.** This edition previews planned changes and supports manual editing through Roblox's own interface.

## Features

- Confirm the target group ID and limit operations to the intended creator.
- Preview batch names/descriptions, including `{group}` placeholders.
- Preserve description paragraphs, preview expandable long text, and optionally add selected clothing tags from a fixed vocabulary.
- Filter shirts, pants, T-shirts; select items individually or in bulk.
- Inspect activity and results in a floating in-page panel.
- Switch between refined **dark and light themes**.
- Export inventory and reports; clear locally saved data.
- Prepare an archive review checklist, with age estimates. **Actual Marketplace archiving remains manual.**

## Installation — free

1. Download or clone the repository.
2. Open `chrome://extensions` in Google Chrome.
3. Turn **Developer mode** on.
4. Click **Load unpacked**, then choose the folder that contains `manifest.json`.
5. Open the [Creator Dashboard](https://create.roblox.com/dashboard/creations?activeTab=AvatarItems-classics&filterIndex=0). Click the small Clothwork button, then **Open editor**.
6. Enter the correct group ID and verify it. Load shirts and pants, then preview the changes.

No paid website, external service, or extension store listing is required.

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

Version **0.6.1** — experimental. The interface and unit tests are locally testable. Roblox APIs and permissions may change; live operation with a real Roblox session is not certified by this repository. This is an independent project, not an official Roblox integration.

## Ownership

Copyright © 2026 Clothwork project author. All rights reserved. The source is available for review, not granted for unrestricted redistribution or commercial reuse. There is no open-source license at present.
