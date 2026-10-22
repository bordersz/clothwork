# Privacy and data handling

Clothwork is a local-first Chrome extension. There are no third-party analytics, advertising SDKs, telemetry, user accounts, or developer-operated servers.

## Local information
- Your chosen group ID and group name, loaded clothing IDs, names, descriptions, created dates, selected state, operation status, and error history are saved in **Chrome extension local storage** to support progress and reports.
- The floating dashboard panel reads only this extension-local state; it cannot access API credentials.
- The **Clear local data** button in the editor erases saved inventory and history. Export anything needed first. Removing the extension also typically clears its local storage.
- Exported CSV/JSON files are created only when you click download and can contain item metadata and your activity; review them before sharing.
- UI theme preference (dark/light) is saved locally.

## Network usage
- Requests go to Roblox-owned HTTPS domains when you verify a group, load inventory, or review metadata.
- The extension does not contact an external Clothwork server and does not transfer activity to the project's author.
- The extension does not require `.ROBLOSECURITY` cookies to be pasted into it. The Roblox browser session may be used by Roblox's inventory endpoint.

## API credentials
- No credentials are requested; metadata edits are completed in Roblox's interface.

## Third-party sharing
Clothwork does not sell or send data to third parties. This extension does not request account permissions.

## Limitations
No software can guarantee immunity from browser malware, compromised devices, or Roblox-side API changes. Review installed extensions regularly.
