# Getting started with Clothwork

Clothwork is a guided workspace for preparing and organizing Roblox classic clothing. **You do not need an API key, OAuth registration, or any additional software.** Roblox saves the edits when you use its own Save button.

## Install on Windows (first time)

1. On the Clothwork GitHub repository, select **Code → Download ZIP**.
2. In Downloads, right-click the ZIP and select **Extract All**.
3. Open the extracted folder. If you see another `clothwork-main` folder, open that one too.
4. Locate the folder that contains the **file** `manifest.json`, alongside `app.html`, `app.js`, and `icon128.png`. Do **not** open or select the manifest file by itself.
5. Open Google Chrome and go to `chrome://extensions`.
6. Turn on **Developer mode** in the upper-right.
7. Select **Load unpacked**. In the folder picker, choose the **folder containing `manifest.json`**, then click **Select Folder**.
8. Go to [Roblox Creator Hub](https://create.roblox.com/dashboard/creations?activeTab=AvatarItems-classics) and refresh that tab. The Clothwork panel will open the first time; use its **Open Clothwork editor** button.

The `docs` and `tests` subfolders are normal project files. Leave them where they are. They are not the folder to select when installing.

## No group loading? Add one clothing item instead

Open **Can't load clothing? Add one by link or ID**, paste a Roblox catalog item URL or its numeric asset ID, choose Shirt/Pants/T-shirt, and select **Add to clothing list**. You can prepare names and descriptions without requesting API credentials. Roblox checks permissions when you attempt to save. If a description contains `{group}`, replace it with the actual group name before previewing.

## Choose your clothing and naming option

1. In the editor, enter the number of a group whose clothing you manage, then select **Check group**.
2. Select which types to load and choose **Load all selected clothing**.
3. Under **Clothing names**, pick one:
   - **Keep current names**: descriptions can still be changed.
   - **One name for all**: the same new name will be prepared for every selected item.
   - **Name items individually**: choose **Go to clothing names** and enter a new name next to each item. Leave blank to keep an item’s name.
4. For descriptions, enable **Update descriptions** and type your text. New lines and blank lines are preserved. The optional tag picker includes only the selected terms.
5. Select **Preview changes**, then review the affected clothing.

## Save to Roblox

For each item:

1. Select **Copy name** or **Copy description** in the item’s row.
2. Select **Open in Roblox** to open the configuration page.
3. Paste into the appropriate field and select Roblox’s own **Save** control.
4. Check the change on Roblox, then select **Mark saved** in Clothwork.

**Clothwork does not automatically change an item or archive it.** No developer API keys or OAuth setup are used.

## Archive a clothing item

1. In Clothwork, find **Archive clothing** and select **Show eligible items**. Clothwork estimates eligibility from the saved creation date; missing or inaccurate dates need manual review.
2. Choose **Archive on Roblox** to open the creations area.
3. Find the item and select the **⋯** button on its thumbnail.
4. Choose **Archive in Marketplace** and confirm through Roblox.
5. After confirming the item is archived, return to Clothwork and select **Mark archived**.

Roblox generally requires an avatar item to be uploaded at least **180 days** earlier. Limited items cannot be archived. These rules and controls may change.

## Common questions

**Why does the folder contain `manifest.json` rather than a folder called manifest?** The manifest is an extension configuration file. Select the parent folder containing that file.

**Why is the sidebar missing?** Refresh the Roblox Creator Dashboard after installing or reloading the extension. The sidebar appears only on supported `create.roblox.com/dashboard/` pages. Check `chrome://extensions` for errors.

**Why can’t I save a whole group automatically?** This public version uses a manual-save approach instead of collecting Roblox API keys or bypassing official authorization.

**Why is inventory loading failing?** Make sure you are signed in, the group ID is correct, and the items belong to that group. Roblox can change its endpoints or browser requirements. If needed, use **Import CSV**.

**Why might a description be moderated?** Roblox evaluates the actual clothing and description. The suggested keywords are not guaranteed to pass moderation; select only accurate, relevant terms.

## Styling and accessibility

The workspace includes a subtle animated cat and a light/dark theme. Animations stop when reduced-motion preferences are enabled. No Tenor image, remote tracking pixel, or externally hosted script is downloaded.
