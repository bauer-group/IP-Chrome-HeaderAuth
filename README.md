# BAUER GROUP – Header Authenticator

A Chrome/Brave/Edge (Manifest V3) extension that transparently protects internal
services behind a header-based authentication barrier. It injects a configurable
secret header (a GUID, default `X-BAUERGROUP-Auth`) into outgoing requests to the
domains you configure; a reverse proxy / WAF in front of the service validates it.

> Greenfield successor to the original `BAUERGROUP.Extension.Chrome.HeaderAuth`.
> Built on a modern stack and a flexible rule model. The legacy repository is archived.

## Features

- **Rule/profile model** – any number of rules, each with its own domains, header
  name and secret. Different service groups can use different GUIDs.
- **Professional UI** – a compact status popup and a full options page (CRUD table,
  validated add/edit dialog, masked secret with reveal/generate/copy, domain chips,
  JSON import/export). German + English, switchable in-app.
- **Cross-device sync** – configuration syncs via the browser account
  (`chrome.storage.sync`); secrets can optionally be kept device-local per rule.
- **Enterprise rollout** – central provisioning via `chrome.storage.managed`
  (GPO/MDM). Managed rules are read-only with an organization badge.
- **Least privilege** – only the canonical `*.app.bauer-group.com` is granted by
  default; user-added domains request host access at runtime.

**Extension ID (pinned):** `jncjhkagdjiiohjfmbpmlemdchbkjaib`

## Tech stack

WXT (Vite-based) · React 19 · Tailwind 4 · shadcn-pattern components (Radix) ·
Zod 4 · TypeScript (strict+) · ESLint flat + Prettier · Vitest · commitlint + simple-git-hooks.

## Development

```bash
npm install          # also runs `wxt prepare` (generates .wxt types)
npm run dev          # Chrome dev with HMR
npm run dev:firefox  # Firefox dev with HMR

npm run typecheck
npm run lint
npm test
```

## Build & package

```bash
npm run build                 # unpacked build -> .output/chrome-mv3/  (for "Load unpacked")
npm run zip                   # distributable zip -> .output/*-chrome.zip
npm run zip:firefox           # .output/*-firefox.zip
npm run sign:crx              # signed .crx + updates.xml (needs .keys/key.pem locally)
```

Three first-class artifacts are produced:

| Artifact                      | Command                             | Purpose                                 |
| ----------------------------- | ----------------------------------- | --------------------------------------- |
| Unpacked (`dist`)             | `wxt build` → `.output/chrome-mv3/` | Developer install via "Load unpacked"   |
| Distributable ZIP             | `wxt zip` → `.output/*.zip`         | Web Store upload / manual sharing       |
| Signed `.crx` + `updates.xml` | `npm run sign:crx`                  | Self-hosted force-install + auto-update |

## Install (developer / manual)

1. `npm install && npm run build`
2. Open `chrome://extensions` (or `brave://`, `edge://`), enable **Developer mode**.
3. **Load unpacked** → select `.output/chrome-mv3`.

## Distribution to workstations

The extension reaches managed workstations via **enterprise force-install policy**,
through two parallel channels (same extension ID, one channel per machine):

- **Self-hosted** – signed `.crx` + `updates.xml` published as GitHub Release assets;
  `update_url` points at `…/releases/latest/download/updates.xml`.
- **Chrome Web Store (unlisted)** – `update_url` is the Web Store update service.

See [`docs/deployment/`](docs/deployment/) for ready-to-use GPO `.reg`, macOS
configuration profile, and managed-config examples.

## Signing key

The signing key pair gives the extension its stable ID. The **private** key is
**never committed** (`.keys/key.pem`, gitignored). In CI it is provided as the
`EXTENSION_PRIVATE_KEY` secret. The matching public key is pinned as `key` in
`wxt.config.ts`. Losing the private key changes the ID and breaks force-install
policies — store it in the team password manager.

Provision it with `npm run secrets:sync`, which reads `.keys/key.pem` directly
and refuses to push a key that would derive a different extension ID. See
[`docs/secrets.md`](docs/secrets.md) for the full set of repository secrets and
which ones are inherited from the organization instead.

## Security notes

- **Shipped code has 0 known vulnerabilities.** The dev-only audit findings trace to
  `wxt → web-ext-run` (the Firefox dev runner) and never ship.
- **Secrets in sync** are stored unencrypted in the browser account cloud (the
  cross-device-sync trade-off). For governed secrets, push them via managed policy,
  or disable "Sync secret across devices" on a rule to keep it device-local.
- **WSS is best-effort.** Header modification on WebSocket upgrades initiated from a
  service worker is unreliable (Chromium limitation); page-initiated WebSockets work.

## License

MIT
