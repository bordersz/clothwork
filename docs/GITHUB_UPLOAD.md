# Fixing the existing GitHub repository

Your old repository accidentally has a double wrapper path like `clothwork-chrome-extension-v0.3/roblox-clothing-studio/`. This means the README is not at the root, so GitHub shows **Add a README**.

**Easiest reliable fix — GitHub Desktop (free):**

1. Export any Clothwork results and back up the repository on your PC.
2. Install [GitHub Desktop](https://desktop.github.com/), sign in, then choose **File → Clone repository** and select your `clothwork` repo.
3. In GitHub Desktop, click **Repository → Show in Explorer** to open the local clone.
4. Delete the **old** `clothwork-chrome-extension-v0.3` folder *from that cloned repository only*. Do **not** delete the working extension installed in Chrome.
5. Extract the **GitHub portfolio ZIP** provided with this release. Open the extracted folder until you see `README.md`, `manifest.json`, `app.js` etc.
6. Copy **all of those files and folders** directly into the root of the cloned GitHub repository, alongside `.git`. You should see `README.md` directly at the top level.
7. Return to GitHub Desktop, check the changed-files list, write a summary such as `Organize Clothwork project and add v0.4 UI`, then click **Commit to main**.
8. Click **Push origin**. Refresh your GitHub `clothwork` page; the README will now display below the files.

GitHub Desktop is free. You do not need to create a second repo or pay for anything.

## GitHub Pages (optional, also free)

Go to repo **Settings → Pages → Build and deployment**, select **Deploy from a branch**, choose **main**, select the **/docs** folder and save. If GitHub Pages is enabled for your repo, the address usually follows `https://YOUR_USERNAME.github.io/clothwork/`.

## Important

- Upload only the **public / read-only** edition to this public GitHub repository.
- Keep the personal-use edition and its API credential flow off the public repo.
- GitHub commits from the old project still remain in the repo history; no API keys were detected in the previously supplied source files, but audit any additional commits/files you added separately.
- Do not commit `.ROBLOSECURITY`, Roblox API keys, private activity exports, or secrets.
