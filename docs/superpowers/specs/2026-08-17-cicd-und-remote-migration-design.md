# CI/CD Professionalization & Remote Migration — Design

**Date:** 2026-08-17
**Repo:** `BAUERGROUP.Extension.Chrome.HeaderAuth.v2` → `bauer-group/IP-Chrome-HeaderAuth`
**Status:** Approved

---

## 1. Problem

Three problems, one workstream.

**1.1 — The v2 repo has no remote and no real pipeline.** It carries a single
`.github/workflows/release.yml` that runs _after_ code lands on `main`, so nothing
is verified before a merge. That workflow calls `npm version patch` unconditionally:
the repo enforces Conventional Commits through commitlint, then discards the SemVer
information those commits carry. A `feat:` never yields a MINOR, a `BREAKING CHANGE:`
never yields a MAJOR. Its `publish-web-store` job re-checks-out the pre-bump commit
and rebuilds, so it can package a different version than the one released.

**1.2 — The target remote holds v1, with a completely unrelated history.**
`bauer-group/IP-Chrome-HeaderAuth` is private, its default branch is `master`, and
it holds 27 commits from a hand-rolled `tsc` MV3 extension. `git merge-base` between
the two trees returns nothing — zero shared objects. GitHub cannot render a pull
request between branches with no common ancestor, so the preferred branch-and-PR
route requires manufacturing one first.

**1.3 — The declared runtime is not merely stale, it was never satisfiable.**
`engines.node: ">=20"` sits in `package.json` while `lint-staged@17` demands
`node >=22.22.1` and `@commitlint/cli@21` demands `>=22.12.0`. Node 20 reached EOL
on 2026-04-30.

## 2. Goals & non-goals

**Goals.** Bring the v2 repo to the CI/CD standard of the best repos in the estate,
consuming `bauer-group/automation-templates` rather than reimplementing it. Land v2
on the existing remote through a reviewable pull request without destroying v1
history. Move the runtime to Node 24+ and refresh the dependency set. Raise the test
floor high enough that a coverage gate can actually be enforced.

**Non-goals.** No feature work on the extension itself. No Chrome Web Store listing
is created (the publish job ships wired but disabled). No history rewrite of v1 —
if the secret scan finds something, that becomes its own decision, not a silent fix.

## 3. Decisions

| #   | Decision                                                                       | Rationale                                                                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Tree-replacement commit + PR** (over `-s ours` merge or archive-and-promote) | Manufactures the common ancestor GitHub needs, keeps v1 history linear and reachable, `git bisect` works across the boundary, and it is plain git with no exotic strategy flags. Cost: v2's three local commit messages collapse into one, mitigated by naming their SHAs in the commit body.                           |
| D2  | **First v2 release is `2.0.0`**, set by an explicit annotated tag              | The product is called v2; the SemVer major should say so. Requires the baseline tag because v1's tags stay reachable under D1.                                                                                                                                                                                          |
| D3  | **Rename `master` → `main` before opening the PR**                             | GitHub's rename API retargets open PRs and installs redirects. Doing it first means the PR targets `main` from the start, `modules-semantic-release.yml`'s `target-branch: 'main'` default applies unmodified, and branch protection is configured once.                                                                |
| D4  | **Repo becomes public**, after a secret scan of both histories                 | The self-hosted CRX channel is inoperative on a private repo (see §4.4). MIT-licensed already.                                                                                                                                                                                                                          |
| D5  | **Close the 3 open Dependabot PRs** with a reason                              | They patch v1 code that the migration deletes. Merging them first would add three merge commits for code removed moments later. The CVEs are not fixed — the code is gone; the closing comment says so.                                                                                                                 |
| D6  | **Chrome Web Store job stays wired but disabled**                              | v1 was never published from this repo (verified across all 27 commits: no `key.pem`, no CWS credentials, no upload step). v2 pins a new extension ID, so it could not update a pre-existing listing in place anyway.                                                                                                    |
| D7  | **Reusable-first: `nodejs-build.yml@main` for the gate**                       | It covers `node-version-file`, `enable-matrix`, lint/format/typecheck/test/coverage/audit/build and artifact upload. The extension-specific parts fit its existing inputs: three browsers in one `build-command`, `.output/` in `artifact-path`. No hand-rolling justification exists here.                             |
| D8  | **TypeScript stays on `^6.0.3`**                                               | `typescript-eslint@8.67` declares peer `typescript: ">=4.8.4 <6.1.0"`. TS 7 shipped without a stable programmatic API and typescript-eslint closed TS7 support as _not planned_. Upgrading breaks `npm run lint`. Recorded here **and** as a `dependabot.yml` ignore entry, so the eventual PR is not helpfully merged. |

## 4. Architecture

### 4.1 Workflow set

```
pull_request ──┬─► ci.yml            🔍  nodejs-build.yml@main
               │                         matrix node [24, 26]
               │                         lint · format:check · typecheck
               │                         test + coverage (80% on src/lib)
               │                         audit (high) · build chrome+firefox+edge
               │
               └─► pr-validation.yml 🔍  modules-pr-validation.yml@main
                                         modules-dependency-review.yml@main

push main ─────┬─► ci.yml                (regression net)
               │
               └─► release.yml       🚀
                      ├─ gate            uses: ./.github/workflows/ci.yml
                      ├─ release         needs gate · modules-semantic-release.yml@main
                      ├─ publish-assets  if release-created · checkout ref: v${version}
                      └─ publish-web-store  if vars.PUBLISH_WEB_STORE · continue-on-error

issues/PR ─────► ai-issue-summary.yml      🤖
schedule/push ─► codeql.yml                🛡️  modules-codeql.yml@main
dependabot PR ─► dependabot-maintenance.yml 🤖
```

`ci.yml` declares `workflow_call` so `release.yml` reuses it rather than duplicating
the `with:` block. This keeps the pre-merge gate and the release gate provably
identical — they are the same file.

### 4.2 The permission ceiling

`nodejs-build.yml` internally calls `modules-code-quality.yml`, which declares
`pull-requests: write`. GitHub validates the permissions of every called workflow
when the run is created — **before** any job `if:` is evaluated — so this applies
even with `enable-sonar: false`. A caller that cannot satisfy it fails with
`startup_failure` and produces no log.

Omitting the `permissions:` block does not help: a partial block sets every unnamed
scope to `none`, and the repo default is already `pull-requests: none`. Every job
that calls `nodejs-build.yml`, directly or through `ci.yml`, must declare:

```yaml
permissions:
  contents: read
  pull-requests: write
```

### 4.3 Version mechanics — the 2.0.0 baseline

Under D1 the v1 tags (`v0.0.19`, `v0.0.20`, `v0.0.24`) stay reachable from the
release branch, and semantic-release baselines off the highest reachable tag. Left
alone, the migration commit — a `feat!:` — would compute `1.0.0`
(`semver.inc('0.0.24', 'major')`; semantic-release applies no preMajor downgrade,
that is `standard-version` behaviour). D2 asks for `2.0.0`, so the baseline is set
explicitly:

```
1. push branch, open PR         → ci.yml validates the full pipeline BEFORE the merge
2. git tag -a v2.0.0 <tip>      → seeds the baseline
   git push origin v2.0.0
3. gh pr merge --merge          → MERGE COMMIT, never squash
                                  (squash rewrites the SHA; the tag would not be in main)
4. release.yml fires on main    → highest reachable tag = v2.0.0
                                  commits since = the merge commit only, no conventional type
                                  → "no relevant changes" → no release, clean no-op
5. gh release create v2.0.0     → one-time, manual, with zips + crx + updates.xml
6. next feat:/fix:              → 2.1.0 / 2.0.1 / 3.0.0, fully automatic
```

Step 5 is the only manual version action, and it is appropriate: it is a one-time
event. From step 6 onward nothing touches a version number by hand.

**Squash merging is not an option here.** It produces a new commit SHA, leaving the
`v2.0.0` tag pointing at a commit that never reaches `main`; semantic-release would
then fall back to `v0.0.24` and cut `1.0.0` over the top.

### 4.4 The CRX distribution defect

`scripts/sign-crx.mjs` writes `updates.xml` with a `codebase` of
`https://github.com/${GITHUB_REPOSITORY}/releases/latest/download/header-authenticator.crx`.
Chrome's updater fetches that URL **anonymously**. Release assets on a private repo
require a token, so the URL returns 404 on every managed device — the entire
`docs/deployment/` force-install story (GPO `ExtensionInstallForcelist`, the `.reg`,
the `.mobileconfig`) is inoperative today. D4 resolves this.

Two further defects in the same file: the repo fallback is
`bauer-group/BAUERGROUP.Extension.Chrome.HeaderAuth`, which is neither repo's name,
and a missing key causes `process.exit(0)` — a green release with silently absent
assets. The soft path stays for local development; under `CI` it must fail loudly.

## 5. Files

| Path                                           | Status    | Content                                       |
| ---------------------------------------------- | --------- | --------------------------------------------- |
| `.nvmrc`                                       | new       | `24`                                          |
| `LICENSE`                                      | new       | MIT, `Copyright (c) BAUER GROUP`              |
| `CHANGELOG.md`                                 | generated | by semantic-release                           |
| `.github/CODEOWNERS`                           | new       | `*   @bauer-group/core`                       |
| `.github/dependabot.yml`                       | new       | npm + github-actions, weekly sunday 06:30 UTC |
| `.github/config/release/semantic-release.json` | new       | Node variant, `npmPublish: false`             |
| `.github/config/commitlint.config.js`          | new       | path read by `modules-pr-validation.yml`      |
| `.github/workflows/ci.yml`                     | new       | gate                                          |
| `.github/workflows/pr-validation.yml`          | new       | commit + supply-chain gates                   |
| `.github/workflows/release.yml`                | replaced  | release pipeline                              |
| `.github/workflows/codeql.yml`                 | new       | SAST                                          |
| `.github/workflows/ai-issue-summary.yml`       | new       | AI triage                                     |
| `.github/workflows/dependabot-maintenance.yml` | new       | auto-merge                                    |

Deliberately **not** created — inherited from `bauer-group/.github`:
`SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `PULL_REQUEST_TEMPLATE.md`,
`ISSUE_TEMPLATE/`.

### 5.1 Action pins

`actions/checkout@v7`, `actions/setup-node@v6`, `softprops/action-gh-release@v3`,
`actions/upload-artifact@v7`. Internal `bauer-group/automation-templates` references
pin `@main` per org rule. Node comes from `node-version-file: '.nvmrc'` — never a
literal in a workflow.

### 5.2 Dependabot commit prefixes

`github-actions` uses `chore(ci)`; npm uses `fix(deps)`. The prefix is load-bearing:
`chore(...)` never cuts a release, so a runtime dependency fix carrying that prefix
lands on `main` and then waits for an unrelated releasing commit — for a security
patch, potentially weeks. In a bundled extension nearly everything except pure
linting tooling ends up in the shipped artifact, so npm updates take `fix(deps)`.
A single grouped weekly PR bounds this to at most one patch release per week.

## 6. Runtime & dependencies

`engines.node` becomes `">=24"` and `.nvmrc` contains `24` — matching all 19
non-external `.nvmrc` files found in the estate. `">=24"` rather than `^24` so
Node 26 is admitted when it reaches LTS on 2026-10-28 without a manifest change.

The CI matrix covers `[24, 26]`. The release job stays **single**, pinned via
`.nvmrc`: a publishing pipeline that fans out produces duplicate tags and releases.

| Change                          | Detail                                                                                                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wxt` `^0.20.26` → `^0.21.4`    | 0.21 makes `vite` a required peer → add `vite` to devDependencies. Everything 0.21 removed (`webextension-polyfill`, `url:` imports, `useAppConfig`, `globalName`, isolated-element) is unused here. |
| `npm update`                    | 26 packages behind, all within-caret. `lucide-react` 1.20 → 1.31 spans 11 minors and gets an icon smoke-check.                                                                                       |
| `typescript`                    | **held** at `^6.0.3` — see D8.                                                                                                                                                                       |
| `@radix-ui/react-dropdown-menu` | removed; declared but imported nowhere.                                                                                                                                                              |
| added                           | `@vitest/coverage-v8`, `jsdom`, `@webext-core/fake-browser`                                                                                                                                          |

## 7. Testing

`vitest.config.ts` today sets `include: ['src/**/*.test.ts']`, which does not match
`.tsx` — component tests would silently not run. It becomes
`src/**/*.test.{ts,tsx}` with `environment: 'jsdom'` and a v8 coverage provider at
an **80 % threshold on `src/lib/**`\*\*.

Six modules touching the `browser` global are currently untested and must be covered
before that threshold can be enforced: `src/lib/effective.ts`,
`src/lib/storage/index.ts`, `src/lib/storage/managed.ts`, `src/lib/dnr/apply-rules.ts`,
`src/lib/rule-status.ts`, `src/lib/permissions/index.ts`. They use
`@webext-core/fake-browser` — WXT's own testing path — rather than hand-written mocks.

The gate's `coverage-threshold` is switched on only after these land. Enabling it
first would produce a red gate on day one.

## 8. Migration sequence

| #   | Phase       | Action                                                                                                            | Reversible          |
| --- | ----------- | ----------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | Local       | All changes from §5–7 on the v2 repo's `main`, atomic commits, green locally (lint · typecheck · test · build ×3) | yes                 |
| 2   | Scan        | Gitleaks across **both** histories (27 v1 + n v2 commits) → report to the human                                   | yes                 |
| 3   | Remote prep | Close Dependabot PRs #1–3 + delete branches · rename `master` → `main`                                            | yes                 |
| 4   | Migration   | `remote add` · branch from `origin/main` · tree-replace · commit · push · open PR                                 | yes (delete branch) |
| 5   | Validation  | Wait for CI green on the PR — the first real test of the new pipeline                                             | yes                 |
| 6   | Merge       | tag `v2.0.0` → `gh pr merge --merge` → `gh release create v2.0.0` with assets                                     | `git revert`        |
| 7   | Settings    | `allow_auto_merge` · `delete_branch_on_merge` · branch protection · `EXTENSION_PRIVATE_KEY` secret                | yes                 |
| 8   | Public      | After human approval of the scan report: visibility flip · verify the CRX URL                                     | **no**              |

Step 8 is the only practically irreversible action and requires explicit approval:
once indexed, always indexed.

Branch protection required-checks are configured **after** the first CI run, because
the job names are not known until then.

## 9. Risks

**The secret scan may find something in v1 history.** That escalates to the human
rather than resolving silently — a history rewrite is its own decision with its own
trade-offs, not a step in this plan.

**`.keys/key.pem` exists only on one workstation.** It is the sole determinant of
the extension ID `jncjhkagdjiiohjfmbpmlemdchbkjaib`; losing it invalidates every
force-install policy. It reaches CI via `gh secret set EXTENSION_PRIVATE_KEY <
.keys/key.pem`, which never prints the material. A second copy in the team password
manager is a human task, tracked here because the pipeline cannot do it.

**`-s ours` was rejected** partly because a later merge of `master` into `main` would
be a silent no-op. D1 avoids the flag entirely, so this does not apply — noted so a
future reader does not reintroduce it.
