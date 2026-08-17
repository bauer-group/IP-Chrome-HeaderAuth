# Secrets

Three different things are called "secrets" in this repo's CI, and only the
first group is yours to manage.

| Category                      | Entries                                                                                             | What to do                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Repository** (managed here) | `EXTENSION_PRIVATE_KEY`, `CWS_*`, `PUBLISH_WEB_STORE`                                               | `npm run secrets:sync`                       |
| **Organization** (inherited)  | `GITGUARDIAN_API_KEY`, `GITLEAKS_LICENSE`, `CODECOV_TOKEN`, `SONARQUBE_TOKEN`, `SONARQUBE_HOST_URL` | Nothing — they arrive via `secrets: inherit` |
| **Automatic**                 | `GITHUB_TOKEN`                                                                                      | Nothing — Actions provides it per run        |

> Do **not** re-create an organization secret at repository level. A repo entry
> shadows the org one, and you have quietly taken on a second rotation schedule
> that nobody will remember. If an org secret needs changing, change it in the
> org.

## Repository entries

| Name                    | Kind     | Required              | Purpose                                                    |
| ----------------------- | -------- | --------------------- | ---------------------------------------------------------- |
| `EXTENSION_PRIVATE_KEY` | secret   | **yes, for releases** | Signs the `.crx` for the self-hosted force-install channel |
| `PUBLISH_WEB_STORE`     | variable | no (defaults to off)  | `"true"` enables the Chrome Web Store publish job          |
| `CWS_CLIENT_ID`         | secret   | only if publishing    | Chrome Web Store API OAuth client                          |
| `CWS_CLIENT_SECRET`     | secret   | only if publishing    | ″                                                          |
| `CWS_REFRESH_TOKEN`     | secret   | only if publishing    | ″                                                          |
| `CWS_EXTENSION_ID`      | secret   | only if publishing    | Target listing ID                                          |

`PUBLISH_WEB_STORE` is a **variable**, not a secret, because
`if: vars.PUBLISH_WEB_STORE == 'true'` in
[`release.yml`](../.github/workflows/release.yml) needs to read it — a workflow
cannot branch on the contents of a secret.

## The signing key

`EXTENSION_PRIVATE_KEY` is the private half of the extension's signing key pair.
It **alone** determines the extension ID `jncjhkagdjiiohjfmbpmlemdchbkjaib`; the
matching public half is pinned as `EXTENSION_KEY` in
[`wxt.config.ts`](../wxt.config.ts).

- It lives at `.keys/key.pem` (gitignored) and is **never** copied into `.env`.
  Two copies drift; one does not.
- `npm run secrets:sync` reads it from that path directly.
- Before pushing, the sync derives the public half and compares it against
  `wxt.config.ts`. A mismatch aborts with both extension IDs printed. Without
  that check, the wrong key gives you a green pipeline, a valid `.crx` and a
  different extension ID — every `ExtensionInstallForcelist` entry silently
  stops matching, with no error anywhere.
- It is **never deleted** by a sync. A missing local file means "not on this
  machine", not "retire the CI secret".

> **Losing this key cannot be undone.** The ID changes, every force-install
> policy breaks, and existing installs cannot be updated — only reinstalled.
> A copy belongs in the team password manager. The pipeline cannot do that
> for you.
>
> `.keys/` also holds `pubkey.b64` and `extension-id.txt`. Neither is a secret
> and neither is needed by CI: both are derived from `key.pem`, and both values
> are already public — in `wxt.config.ts` and in
> [`deployment/`](./deployment/README.md) respectively.

## Local setup

```bash
cp .env.example .env      # then fill in only what you actually have
npm run secrets:sync:dry  # inspect the plan
npm run secrets:sync      # apply
```

`.env` is gitignored; `.env.example` is the committed schema and carries the
documentation of every key.

## The sync

[`scripts/secrets/sync.mjs`](../scripts/secrets/sync.mjs) reconciles local
values into GitHub Actions via the `gh` CLI. Routing is per-key, driven by
marker comments in `.env.example`:

| Marker        | Target                                           |
| ------------- | ------------------------------------------------ |
| `# @secret`   | Repository Secret — `${{ secrets.X }}`           |
| `# @var`      | Repository Variable — `${{ vars.X }}`            |
| `# @file <p>` | Repository Secret, value read from `<p>` on disk |
| `# @local`    | Never synced; stale CI copies are cleaned up     |
| _(none)_      | `@secret`                                        |

```bash
npm run secrets:list      # what is currently in GitHub (both buckets)
npm run secrets:push      # add/overwrite only, never deletes
npm run secrets:sync      # add/overwrite + delete + relocate between buckets
npm run secrets:sync:dry  # print the plan, change nothing
```

Two rules worth knowing before you run it:

**An empty value means "not configured here", never "push an empty string".**
Copying `.env.example` to `.env` leaves the optional keys blank; those are
skipped, not pushed. In `sync` mode an emptied key is a _delete_ candidate — so
`push` is the safe verb when your local `.env` is incomplete.

**Deletion is scoped to `.env.example`.** Anything in GitHub that this file does
not declare is reported as external and left alone. Organization secrets are not
repository entries at all, so they can never be touched.
