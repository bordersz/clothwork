# Clothwork user guide

Clothwork organizes Roblox classic shirts, pants and T-shirts. Your work and progress are saved in Chrome. This public version needs no API key and does not automatically modify Roblox.

## Install once

1. On [GitHub](https://github.com/bordersz/clothwork), choose **Code → Download ZIP** and extract the ZIP.
2. Open the extracted folder until you see `manifest.json` beside `app.js`.
3. In Chrome, visit `chrome://extensions`, enable **Developer mode**, and click **Load unpacked**.
4. Select the **folder containing `manifest.json`**, not the file itself.
5. Open [Roblox Creator Dashboard](https://create.roblox.com/dashboard/creations?activeTab=AvatarItems-classics) and refresh the page. Open the editor from the Clothwork companion.

## Get started

1. Enter your group ID, select **Check group**, and then **Load clothing from this group**. Choose shirts, pants or T-shirts.
2. Let Clothwork retrieve the group's inventory pages. It has a small pause between page requests and handles temporary rate limits. Keep the editor tab open until it finishes.
3. Choose the items to update. Select **Keep current names**, **One name for all** or **Name items individually**, then prepare any new description.
4. Select **Start editing**. Clothwork checks your inputs and opens the clothing list. No separate Preview or Go button is needed.
5. For each item, select **Copy name** or **Copy description**, open it in Roblox, paste the prepared text, and save using Roblox's **Save** button. Select **Mark saved** in Clothwork afterward.

The inventory has **100 rows per page** for responsiveness, without hiding items beyond page one. Use **Previous** and **Next** to navigate all matching results. **Select all matching** selects every filtered item, not only the current page.

## Helpful extras

- **Add one by link or ID** is available if the group inventory cannot be loaded.
- **Search** locates an item by name or ID. Status filters narrow the list.
- **Export (optional)** contains CSV and JSON export buttons. Clothwork does not download files during Start editing or normal inventory loading.
- **Archive clothing** helps you review age eligibility, but archiving itself must be completed on Roblox.
- **Clear local data** removes locally saved items and statuses, not your actual Roblox clothing.

## Troubleshooting

**Missing manifest:** Select the extracted folder containing `manifest.json` and `app.js` together.

**Sidebar not visible:** Reload Clothwork in `chrome://extensions` and refresh the Creator Dashboard.

**Inventory interrupted:** Roblox may rate-limit or change inventory endpoints. Retry loading the group if necessary. Previously loaded items and their statuses are retained when IDs match, but the public version does not guarantee that every Roblox request will succeed.

**Can it automatically edit or archive items?** No. The public version prepares text and tracks manual saves, without asking for API keys or OAuth permissions.

**Will tags avoid moderation?** No tag list guarantees moderation outcomes. Use only relevant and accurate descriptors.

Clothwork is an independent project, not affiliated with Roblox.
