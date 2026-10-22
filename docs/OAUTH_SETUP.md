# Clothwork OAuth beta setup

## Register the Roblox app (project owner)

1. In [Roblox Creator Hub credentials](https://create.roblox.com/dashboard/credentials), register an OAuth 2.0 app named Clothwork. Roblox requires eligible verified developers and may limit private testing.
2. Request `openid`, `profile`, `asset:read` and `asset:write`.
3. Register this **exact redirect URL** for the GitHub unpacked extension:

`https://eajelccpofjeaajjggiajpahjpjddanc.chromiumapp.org/roblox`

4. Save the app and copy its numeric **Client ID**. This is public. Never share a client secret or user API key.
5. In the Clothwork editor paste the Client ID once, click **Save ID**, then **Connect with Roblox**. Roblox handles the permission screen.

You must register this app yourself in Roblox Creator Hub. This beta has not been live-tested on real Roblox assets. Test on one expendable item before attempting bulk updates.

## Sharing Clothwork

Your girlfriend can visit [bordersz/clothwork](https://github.com/bordersz/clothwork), click **Code → Download ZIP**, extract it, visit `chrome://extensions`, enable **Developer mode**, and click **Load unpacked** (the folder containing `manifest.json`). Send her only the public OAuth Client ID. She signs in as herself and grants her own Roblox permissions.

The pinned *public* manifest key ensures this unpacked build has the same Chrome extension ID and OAuth callback across testers. Private Roblox OAuth apps have a small user limit; Roblox OAuth app publication/review is needed for a wider user base. Chrome Web Store publishing is a separate process and may require adding a second redirect URL for its extension ID.

Legacy inventory listing relies on an existing Roblox browser login. If loading does not work, Roblox's endpoint or browser cookie settings may be responsible. CSV import supports previewing listed assets, but editing still requires verified ownership from Open Cloud.
