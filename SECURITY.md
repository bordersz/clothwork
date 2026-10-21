# Security notes

Do not create issues containing API keys, passwords, `.ROBLOSECURITY` cookies, group access secrets, private inventory exports, or screenshots showing credentials.

- The extension uses HTTPS endpoints associated with Roblox.
- No externally hosted executable scripts, analytics or tracking SDKs.
- Asset values are rendered as text nodes to reduce injection risk.
- Live changes in the personal edition require verified group ownership and explicit preview/confirmation, and use per-item checks and request backoff.
- The public edition is intentionally preview-only to avoid collecting API keys from other Roblox creators.
- There is no guarantee against abuse, policy changes, or malformed external API responses; test on a throwaway item before live edits.

If you inadvertently commit a secret to Git, **revoke/rotate the key immediately**. Deleting a file from the current tree does not necessarily remove the secret from Git history.
