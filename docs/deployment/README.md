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
