# Enterprise deployment

Force-install the extension on managed workstations and (optionally) push the
protection rules centrally. Chrome, Brave and Edge are all Chromium-based and honor
the same policy keys.

| Fact                   | Value                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Extension ID           | `jncjhkagdjiiohjfmbpmlemdchbkjaib`                                                         |
| Self-hosted update URL | `https://github.com/bauer-group/IP-Chrome-HeaderAuth/releases/latest/download/updates.xml` |
| Web Store update URL   | `https://clients2.google.com/service/update2/crx`                                          |

> The release assets must be **anonymously downloadable** — the browser fetches
> `updates.xml`/`.crx` with no authentication, so a private repository returns 404 on
> every managed device and the force-install silently never updates. Verify with
> `curl -sSIL -o /dev/null -w '%{http_code}\n' <update URL>` from a shell with no
> GitHub token in the environment; anything other than `200` means this channel is
> dead. If the repository ever returns to private, host the two files on internal
> HTTPS / MinIO and repoint `update_url` there.

### Why the release-asset URL, and when to reconsider

That URL is not a direct download. It answers `302` to
`.../releases/download/<tag>/updates.xml`, which redirects again to
`release-assets.githubusercontent.com` with a **signed URL valid for about an
hour**, served as `application/octet-stream`. Chrome's updater follows the chain
without complaint — this is verified working, not assumed.

The alternative is GitHub Pages: one origin, one hop, no signature, and a
correct `Content-Type`. It was evaluated and **deliberately not built**, because
on an open network it buys no correctness — only a second publication path that
can drift from the release it is supposed to mirror.

**Reconsider if managed clients ever sit behind an egress allowlist or a
TLS-inspecting proxy.** The second hop leaves `github.com` for a different host,
so an allowlist that permits `github.com` but not `*.githubusercontent.com`
breaks the update check while everything still looks healthy from the repo side.

If that day comes, the constraint on the fix is that Pages must publish from the
**same job and the same artifacts** as the release assets — never as an
independent workflow, or `updates.xml` will eventually advertise a version whose
`.crx` is not there yet. Note also that `scripts/sign-crx.mjs` writes the
`codebase` URL _into the CRX_, so a channel switch only takes effect from the
next release onward; it is not retroactive.

### Why the .crx manifest carries its own update_url

The `update_url` in `ExtensionInstallForcelist` is used for the **initial install
only**. Every later update check reads the URL from the **extension's own
manifest** instead. A self-hosted `.crx` without that field therefore installs
once and then never updates: Chrome falls back to the Web Store update service,
finds no listing for this ID, and the client stays pinned to whatever it first
installed — silently, with nothing to see on the policy side.

`scripts/sign-crx.mjs` stamps the field in, on a **copy** of the build. It cannot
go into `.output/chrome-mv3` itself, because the Chrome Web Store rejects an
uploaded package whose manifest declares `update_url` — the two channels need two
manifests. The extension ID is the hash of the pinned public key, so stamping does
not move it.

Verify on any published release:

```bash
curl -sSL -o /tmp/h.crx <crx URL>
python3 - <<'EOF'
import json, struct, zipfile, io
b = open('/tmp/h.crx','rb').read()
z = zipfile.ZipFile(io.BytesIO(b[12+struct.unpack('<I', b[8:12])[0]:]))
m = json.loads(z.read('manifest.json'))
print(m['version'], m.get('update_url', 'MISSING -- clients will never update'))
EOF
```

## 1. Force-install (the extension itself)

Use **one** channel per machine — set `update_url` to either the self-hosted
`updates.xml` or the Web Store service, not both.

### Windows (Group Policy / registry)

Force-install value format: `"<id>;<update_url>"`. See
[`force-install-windows.reg`](force-install-windows.reg) for a ready file (Chrome,
Brave, Edge). Key paths:

- Chrome: `HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist`
- Brave: `HKLM\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallForcelist`
- Edge: `HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist`

With the official ADMX templates you can set the same under
_Computer Configuration → Administrative Templates → Google/Chrome → Extensions →
Configure the list of force-installed apps and extensions_.

### macOS (configuration profile / MDM)

Deploy [`macos-chrome-forcelist.mobileconfig`](macos-chrome-forcelist.mobileconfig)
via your MDM (Jamf, Intune, etc.). It sets `ExtensionInstallForcelist` for
`com.google.Chrome` (duplicate the payload for `com.brave.Browser` /
`com.microsoft.Edge` as needed).

## 2. Push the configuration (managed storage)

Provisioning rules centrally makes protection truly transparent — users get the
correct domains + secrets automatically and cannot edit them. The policy shape is
defined by [`../../src/public/managed-schema.json`](../../src/public/managed-schema.json);
an example payload is in [`managed-config.example.json`](managed-config.example.json).

- **Google Admin console / Microsoft Intune / Jamf** – paste the JSON as the
  managed configuration for the extension ID. This is the recommended path for the
  rule array.
- **Windows registry** – Chromium reads managed storage from
  `HKLM\SOFTWARE\Policies\Google\Chrome\3rdparty\extensions\jncjhkagdjiiohjfmbpmlemdchbkjaib\policy`.
  Simple values (`masterEnabled`) map directly; arrays/objects (`rules`) use numbered
  subkeys — the Admin console / Intune JSON path is far less error-prone for those.

Effective configuration = **managed rules (read-only) ∪ user rules**. A managed
`masterEnabled` overrides the in-app master switch.

## 3. Verify on a test machine

1. Apply the force-install policy, restart the browser.
2. `chrome://extensions` shows the extension installed and **managed** (not removable).
3. If a managed config was pushed, the options page lists the managed rule(s) with the
   _"Managed by your organization"_ badge.
4. On a protected domain, DevTools → Network shows the `X-BAUERGROUP-Auth` request
   header. `chrome://policy` lists the applied policies.
