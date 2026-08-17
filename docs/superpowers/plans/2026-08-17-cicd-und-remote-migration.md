# CI/CD Professionalization & Remote Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the v2 WXT extension repo to the BAUER GROUP CI/CD standard, move it to Node 24+, and land it on `bauer-group/IP-Chrome-HeaderAuth` (which holds v1 under an unrelated history) through a reviewable pull request.

**Architecture:** Consume `bauer-group/automation-templates` reusable workflows rather than reimplementing them. A pre-merge gate (`ci.yml`) is reused verbatim by the release pipeline via `workflow_call`, so the two can never drift. Version numbers come from Conventional Commits via semantic-release; the one-time `2.0.0` baseline is seeded by an explicit tag before the merge.

**Tech Stack:** WXT 0.21 · React 19 · TypeScript 6 · Vitest 4 · npm · GitHub Actions · semantic-release 24

**Spec:** [`docs/superpowers/specs/2026-08-17-cicd-und-remote-migration-design.md`](../specs/2026-08-17-cicd-und-remote-migration-design.md)

## Global Constraints

- **Node floor:** `engines.node` = `">=24"`, `.nvmrc` = `24`. Never a literal Node version inside a workflow — always `node-version-file: '.nvmrc'`.
- **TypeScript is pinned at `^6.0.3`.** Do not upgrade to 7.x under any circumstance: `typescript-eslint@8.67` declares peer `typescript: ">=4.8.4 <6.1.0"`, and TS 7 breaks `npm run lint`.
- **Action pins:** `actions/checkout@v7`, `actions/setup-node@v6`, `softprops/action-gh-release@v3`, `actions/upload-artifact@v7`. Internal `bauer-group/automation-templates` references pin `@main`.
- **Every job calling `nodejs-build.yml` (directly or via `ci.yml`) MUST declare `permissions: {contents: read, pull-requests: write}`.** GitHub validates called-workflow permissions at run creation, before any `if:`. Missing it produces `startup_failure` with no log.
- **Commits:** Conventional Commits, English, **past tense** subject (`added`, `fixed`, `updated`), body mandatory for non-trivial changes. Never `Co-Authored-By:` or any AI attribution.
- **Workflow style:** `name:` starts with an emoji; step names too (`📥 Checkout`, `📦 Setup Node.js`, `📚 Install dependencies`, `🎨 Lint`, `🏗️ Build`, `🧪 Test`). Every file opens with a boxed `# ===` header stating WHAT / WHY / WHEN. Explicit `permissions:` and `timeout-minutes:` everywhere.
- **Never run `git push --tags` from the v1 clone** at `C:/Projects/Internal-Projects/BAUERGROUP.Extension.Chrome.HeaderAuth` — it holds `v0.0.5`, `v0.0.16`, `v0.0.17`, which were deleted upstream and would be resurrected.

---

## File Structure

| Path                                           | Responsibility                                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `.nvmrc`                                       | Single source of the Node version for CI and local dev                                               |
| `LICENSE`                                      | MIT text — `package.json` already declares MIT with no file present                                  |
| `.github/CODEOWNERS`                           | Review ownership                                                                                     |
| `.github/dependabot.yml`                       | Update cadence + the commit prefixes that decide whether an update ships                             |
| `.github/config/release/semantic-release.json` | Release plugin chain (org convention: never `.releaserc` at root)                                    |
| `.github/config/commitlint.config.js`          | Path `modules-pr-validation.yml` reads; the root `commitlint.config.js` stays for the local git hook |
| `.github/workflows/ci.yml`                     | The gate. `workflow_call`-able so `release.yml` reuses it                                            |
| `.github/workflows/pr-validation.yml`          | Pre-merge gates that only make sense on a PR: commitlint, secret scan, license, dependency review    |
| `.github/workflows/release.yml`                | gate → semantic-release → asset publish → CWS (disabled)                                             |
| `.github/workflows/codeql.yml`                 | SAST                                                                                                 |
| `.github/workflows/ai-issue-summary.yml`       | AI triage on new issues/PRs                                                                          |
| `.github/workflows/dependabot-maintenance.yml` | Auto-merge for Dependabot                                                                            |
| `vitest.config.ts`                             | Test env, include glob, coverage provider + threshold                                                |
| `src/lib/*.test.ts`                            | New unit tests for the six untested modules                                                          |
| `scripts/sign-crx.mjs`                         | CRX signing — fail-loud under CI, correct repo fallback                                              |

---

## Task 1: Node 24 runtime floor

**Files:**

- Create: `.nvmrc`
- Create: `LICENSE`
- Modify: `package.json` (`version`, `engines.node`)

**Interfaces:**

- Produces: `.nvmrc` containing `24` — every later workflow reads it via `node-version-file`.

- [ ] **Step 1: Create `.nvmrc`**

```
24
```

(single line, no `v` prefix — matches all 19 non-external `.nvmrc` files in the estate)

- [ ] **Step 2: Create `LICENSE`**

```
MIT License

Copyright (c) BAUER GROUP

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The yearless copyright line is the form the org's own repos use — do not add a year.

- [ ] **Step 3: Update `package.json`**

Change two fields:

```json
  "version": "2.0.0",
  "engines": {
    "node": ">=24"
  },
```

`">=24"` and not `^24`: Node 26 becomes LTS on 2026-10-28 and must be admitted without a manifest change. `version` moves to `2.0.0` to match the baseline tag from Task 11.

- [ ] **Step 4: Verify the local toolchain still resolves**

Run: `npm ls --depth=0`
Expected: no `EBADENGINE` warnings. (The local machine runs Node 25.8.1, which satisfies `>=24`.)

- [ ] **Step 5: Commit**

```bash
git add .nvmrc LICENSE package.json
git commit -F - <<'EOF'
build(runtime): raised the Node floor to 24 and added the MIT LICENSE

engines.node said ">=20", which was never satisfiable by this
dependency set: lint-staged@17 requires >=22.22.1 and
@commitlint/cli@21 requires >=22.12.0. Node 20 also reached EOL on
2026-04-30.

* engines.node ">=20" -> ">=24" (Active LTS until 2028-04-30).
  ">=24" rather than "^24" so Node 26 is admitted when it reaches
  LTS on 2026-10-28 without another manifest edit.
* .nvmrc pins 24 as the single source for CI and local dev — the
  org convention (19 of 19 non-external .nvmrc files in the estate).
* LICENSE added; package.json and the README already claimed MIT
  with no file present.
* version 1.0.0 -> 2.0.0, matching the release baseline tag.
EOF
```

---

## Task 2: Dependency refresh

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json` (generated)

**Interfaces:**

- Consumes: the Node 24 floor from Task 1 (WXT 0.21 requires Node ≥ 22).
- Produces: `vite` as an explicit devDependency — WXT 0.21 declares it a required peer.

- [ ] **Step 1: Remove the unused dependency**

Confirm it is genuinely unused first:

Run: `git grep -n "react-dropdown-menu" -- src/`
Expected: no output.

Then:

```bash
npm uninstall @radix-ui/react-dropdown-menu
```

- [ ] **Step 2: Upgrade WXT and add the vite peer**

```bash
npm install --save-dev wxt@^0.21.4 vite@^8
```

WXT 0.21 promoted `vite` from a bundled dependency to a required peer (`^6.3.4 || ^7 || ^8.0.0-0`). Vite 8 already resolves transitively, so this pins what is effectively there. Everything else 0.21 removed — `webextension-polyfill`, `url:` imports, `useAppConfig`, `globalName`, isolated-element — is unused in this repo, so no migration work follows.

- [ ] **Step 3: Update everything else within caret ranges**

```bash
npm update
```

This moves 26 packages, all within their declared ranges — no manifest edit. Notable: `lucide-react` 1.20 → 1.31 (11 minors).

- [ ] **Step 4: Verify TypeScript did NOT move**

Run: `node -p "require('./package.json').devDependencies.typescript"`
Expected: `^6.0.3`

If it shows `^7`, revert it. See Global Constraints — TS 7 breaks `npm run lint`.

- [ ] **Step 5: Verify the whole toolchain still works**

Run each and confirm exit code 0:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run build:firefox
npm run build:edge
```

Expected: all pass. The three builds each produce a directory under `.output/`.

- [ ] **Step 6: Icon smoke-check**

`lucide-react` spanned 11 minors. Open `.output/chrome-mv3/` and confirm the popup and options pages still reference icons. Cheapest check:

Run: `git grep -n "from 'lucide-react'" -- src/ | wc -l`
Then: `npm run build 2>&1 | grep -i "error\|warn" || echo "clean"`
Expected: `clean`, and the import count unchanged from before the update.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json
git commit -F - <<'EOF'
build(deps): updated WXT to 0.21 and refreshed the dependency set

* wxt ^0.20.26 -> ^0.21.4. 0.21 promoted vite from a bundled
  dependency to a required peer, so vite is now an explicit
  devDependency. Everything 0.21 removed (webextension-polyfill,
  url: imports, useAppConfig, globalName, isolated-element) is
  unused here, so nothing needed migrating.
* npm update moved 26 packages within their caret ranges. The
  widest jump is lucide-react 1.20 -> 1.31; icon imports and the
  three browser builds were verified after.
* Removed @radix-ui/react-dropdown-menu — declared but imported
  nowhere in src/.

typescript deliberately stays at ^6.0.3. npm flags 7.x as latest,
but typescript-eslint@8.67 declares peer ">=4.8.4 <6.1.0" and
closed TS7 support as not planned; upgrading breaks npm run lint.
A dependabot ignore entry guards this.
EOF
```

---

## Task 3: Test infrastructure + the pure module

**Files:**

- Modify: `vitest.config.ts`
- Modify: `package.json` (add `test:coverage` script, add `@vitest/coverage-v8` + `jsdom`)
- Create: `src/lib/rule-status.test.ts`

**Interfaces:**

- Produces: `npm run test:coverage` — the command `ci.yml` invokes in Task 8.
- Produces: a working `fakeBrowser` setup via `WxtVitest()` that Task 4 relies on.

`src/lib/rule-status.ts` is the one untested module that is genuinely pure — it imports only a type. It goes first, before the browser-fake machinery, to prove the harness works.

- [ ] **Step 1: Add the test dependencies**

```bash
npm install --save-dev @vitest/coverage-v8 jsdom
```

No `@webext-core/fake-browser` is needed as a direct dependency: WXT re-exports it from `wxt/testing`, and it is already installed transitively.

- [ ] **Step 2: Replace `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

// WxtVitest() wires up WXT's aliases and auto-mocks `wxt/browser` with
// @webext-core/fake-browser, so modules that import the browser global are
// testable without hand-written mocks.
//
// The include glob covers .tsx as well as .ts: it previously matched only
// `*.test.ts`, so a component test would have been collected by nothing and
// silently never run.
export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      // UI hooks and the i18n provider are exercised through components, not
      // unit tests; they would drag the lib threshold down without signal.
      exclude: ['src/lib/hooks/**', 'src/lib/i18n/**'],
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
```

- [ ] **Step 3: Add the coverage script to `package.json`**

Insert after the existing `"test:watch"` entry:

```json
    "test:coverage": "vitest run --coverage",
```

- [ ] **Step 4: Write the failing test** — `src/lib/rule-status.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { ruleStatus } from './rule-status';
import type { EffectiveRule } from './schema/config';

function makeRule(overrides: Partial<EffectiveRule> = {}): EffectiveRule {
  return {
    id: 'r1',
    enabled: true,
    label: 'Rule',
    domainPatterns: ['app.bauer-group.com'],
    headerName: 'X-BAUERGROUP-Auth',
    secretValue: '11111111-1111-1111-1111-111111111111',
    syncSecret: true,
    source: 'user',
    ...overrides,
  };
}

describe('ruleStatus', () => {
  it('reports active when the rule is enabled and access is granted', () => {
    expect(ruleStatus(makeRule(), true)).toEqual({ key: 'active', managed: false });
  });

  it('reports needs-access when enabled but access is missing', () => {
    expect(ruleStatus(makeRule(), false)).toEqual({ key: 'needs-access', managed: false });
  });

  it('reports disabled regardless of grant state', () => {
    const rule = makeRule({ enabled: false });
    expect(ruleStatus(rule, true)).toEqual({ key: 'disabled', managed: false });
    expect(ruleStatus(rule, false)).toEqual({ key: 'disabled', managed: false });
  });

  it('flags managed rules through every status', () => {
    expect(ruleStatus(makeRule({ source: 'managed' }), true).managed).toBe(true);
    expect(ruleStatus(makeRule({ source: 'managed' }), false).managed).toBe(true);
    expect(ruleStatus(makeRule({ source: 'managed', enabled: false }), true).managed).toBe(true);
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS — 5 existing test files plus this one. `rule-status.ts` is already implemented, so these tests pass immediately; their value is locking the behaviour and proving the new jsdom + WxtVitest harness collects and runs tests correctly.

- [ ] **Step 6: Run coverage and record the baseline**

Run: `npm run test:coverage`
Expected: **the threshold FAILS.** Record the reported percentages — the six untested modules are the gap Task 4 closes. Do not lower the threshold to make this pass.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/lib/rule-status.test.ts
git commit -F - <<'EOF'
test(config): added coverage gating and fixed the test include glob

The include glob was `src/**/*.test.ts`, which does not match .tsx.
A component test would have been collected by nothing and silently
never run — a trap that only surfaces the first time someone writes
one and believes the green result.

* include -> src/**/*.test.{ts,tsx}, environment -> jsdom.
* WxtVitest() plugin wires WXT's aliases and auto-mocks wxt/browser
  with @webext-core/fake-browser, so the modules touching browser
  globals become testable without hand-written mocks.
* v8 coverage over src/lib with an 80% threshold, excluding hooks/
  and i18n/ which are exercised through components rather than unit
  tests.
* Tests for rule-status.ts, the one untested module that is purely
  functional — it proves the harness before the browser fakes land.

The threshold fails at this commit by design; the following commit
covers the six browser-touching modules that make it pass.
EOF
```

---

## Task 4: Tests for the browser-touching modules

**Files:**

- Create: `src/lib/effective.test.ts`
- Create: `src/lib/storage/managed.test.ts`
- Create: `src/lib/storage/index.test.ts`
- Create: `src/lib/dnr/apply-rules.test.ts`
- Create: `src/lib/permissions/index.test.ts`

**Interfaces:**

- Consumes: `WxtVitest()` + `fakeBrowser` from Task 3.
- Produces: coverage above the 80 % threshold, which Task 8's `ci.yml` enforces.

`fakeBrowser.reset()` in a `beforeEach` is mandatory — the fake keeps in-memory state between tests otherwise.

- [ ] **Step 1: Write `src/lib/storage/managed.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { loadManagedConfig, managedRulesToEffective, ManagedConfigSchema } from './managed';

const SECRET = '11111111-1111-1111-1111-111111111111';

describe('loadManagedConfig', () => {
  beforeEach(() => fakeBrowser.reset());

  it('returns null when no policy is provisioned', async () => {
    await expect(loadManagedConfig()).resolves.toBeNull();
  });

  it('parses a provisioned policy', async () => {
    await fakeBrowser.storage.managed.set({
      masterEnabled: true,
      rules: [{ label: 'Corp', domainPatterns: ['*.bauer-group.com'], secretValue: SECRET }],
    });
    const config = await loadManagedConfig();
    expect(config?.masterEnabled).toBe(true);
    expect(config?.rules).toHaveLength(1);
    expect(config?.rules[0].headerName).toBe('X-BAUERGROUP-Auth');
  });

  it('returns null for a policy that fails validation', async () => {
    await fakeBrowser.storage.managed.set({ rules: [{ label: '', domainPatterns: [] }] });
    await expect(loadManagedConfig()).resolves.toBeNull();
  });
});

describe('managedRulesToEffective', () => {
  it('synthesises ids and tags every rule as managed', () => {
    const managed = ManagedConfigSchema.parse({
      rules: [
        { label: 'A', domainPatterns: ['a.example.com'], secretValue: SECRET },
        { label: 'B', domainPatterns: ['b.example.com'], secretValue: SECRET, enabled: false },
      ],
    });
    const effective = managedRulesToEffective(managed);
    expect(effective.map((r) => r.id)).toEqual(['managed-0', 'managed-1']);
    expect(effective.every((r) => r.source === 'managed')).toBe(true);
    expect(effective.every((r) => r.syncSecret)).toBe(true);
    expect(effective[1].enabled).toBe(false);
  });

  it('returns an empty list when the policy has no rules', () => {
    expect(managedRulesToEffective(ManagedConfigSchema.parse({}))).toEqual([]);
  });
});
```

- [ ] **Step 2: Write `src/lib/effective.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { computeEffectiveConfig } from './effective';
import { ManagedConfigSchema } from './storage/managed';
import type { Config } from './schema/config';

const SECRET = '11111111-1111-1111-1111-111111111111';

function userConfig(overrides: Partial<Config> = {}): Config {
  return {
    schemaVersion: 1,
    masterEnabled: true,
    uiLocale: 'de',
    rules: [
      {
        id: 'u1',
        enabled: true,
        label: 'User rule',
        domainPatterns: ['user.example.com'],
        headerName: 'X-BAUERGROUP-Auth',
        secretValue: SECRET,
        syncSecret: true,
      },
    ],
    ...overrides,
  };
}

describe('computeEffectiveConfig', () => {
  it('tags user rules as user-sourced when no policy exists', () => {
    const effective = computeEffectiveConfig(userConfig(), null);
    expect(effective.rules).toHaveLength(1);
    expect(effective.rules[0].source).toBe('user');
    expect(effective.masterEnabled).toBe(true);
  });

  it('places managed rules before user rules', () => {
    const managed = ManagedConfigSchema.parse({
      rules: [{ label: 'Corp', domainPatterns: ['corp.example.com'], secretValue: SECRET }],
    });
    const effective = computeEffectiveConfig(userConfig(), managed);
    expect(effective.rules.map((r) => r.source)).toEqual(['managed', 'user']);
  });

  it('lets a managed masterEnabled override the user switch', () => {
    const managed = ManagedConfigSchema.parse({ masterEnabled: false, rules: [] });
    expect(computeEffectiveConfig(userConfig(), managed).masterEnabled).toBe(false);
  });

  it('falls back to the user switch when the policy omits masterEnabled', () => {
    const managed = ManagedConfigSchema.parse({ rules: [] });
    const user = userConfig({ masterEnabled: false });
    expect(computeEffectiveConfig(user, managed).masterEnabled).toBe(false);
  });
});
```

- [ ] **Step 3: Write `src/lib/storage/index.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { loadConfig, saveConfig, onConfigChanged } from './index';
import type { Config } from '../schema/config';

const SECRET = '11111111-1111-1111-1111-111111111111';
const ZERO_GUID = '00000000-0000-0000-0000-000000000000';

function makeConfig(syncSecret: boolean): Config {
  return {
    schemaVersion: 1,
    masterEnabled: true,
    uiLocale: 'de',
    rules: [
      {
        id: 'r1',
        enabled: true,
        label: 'Rule',
        domainPatterns: ['app.bauer-group.com'],
        headerName: 'X-BAUERGROUP-Auth',
        secretValue: SECRET,
        syncSecret,
      },
    ],
  };
}

describe('loadConfig / saveConfig', () => {
  beforeEach(() => fakeBrowser.reset());

  it('returns defaults when storage is empty', async () => {
    const config = await loadConfig();
    expect(config.rules).toEqual([]);
    expect(config.masterEnabled).toBe(true);
  });

  it('round-trips a synced-secret rule through sync storage', async () => {
    await saveConfig(makeConfig(true));
    const loaded = await loadConfig();
    expect(loaded.rules[0].secretValue).toBe(SECRET);
    expect(loaded.rules[0].syncSecret).toBe(true);
  });

  it('keeps a device-local secret out of sync storage', async () => {
    await saveConfig(makeConfig(false));

    const sync = (await fakeBrowser.storage.sync.get(null)) as Record<string, unknown>;
    expect(JSON.stringify(sync)).not.toContain(SECRET);
    expect(JSON.stringify(sync)).toContain(ZERO_GUID);

    const local = (await fakeBrowser.storage.local.get(null)) as Record<string, unknown>;
    expect(local['secret:r1']).toBe(SECRET);

    const loaded = await loadConfig();
    expect(loaded.rules[0].secretValue).toBe(SECRET);
  });

  it('substitutes the null GUID when the device-local secret is missing', async () => {
    await saveConfig(makeConfig(false));
    await fakeBrowser.storage.local.remove('secret:r1');
    const loaded = await loadConfig();
    expect(loaded.rules[0].secretValue).toBe(ZERO_GUID);
  });

  it('drops the device-local copy when a rule switches back to synced', async () => {
    await saveConfig(makeConfig(false));
    await saveConfig(makeConfig(true));
    const local = (await fakeBrowser.storage.local.get(null)) as Record<string, unknown>;
    expect(local['secret:r1']).toBeUndefined();
  });
});

describe('onConfigChanged', () => {
  beforeEach(() => fakeBrowser.reset());

  it('fires on sync changes and stops after unsubscribe', async () => {
    let calls = 0;
    const unsubscribe = onConfigChanged(() => {
      calls += 1;
    });

    await fakeBrowser.storage.sync.set({ anything: 1 });
    expect(calls).toBeGreaterThan(0);

    const afterSubscribe = calls;
    unsubscribe();
    await fakeBrowser.storage.sync.set({ anything: 2 });
    expect(calls).toBe(afterSubscribe);
  });
});
```

- [ ] **Step 4: Write `src/lib/dnr/apply-rules.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { browser } from 'wxt/browser';
import { applyRules, DnrLimitError, MAX_UNSAFE_DYNAMIC_RULES } from './apply-rules';
import type { ModifyHeaderRule } from './build-rules';

function makeRule(id: number): ModifyHeaderRule {
  return {
    id,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [{ header: 'X-BAUERGROUP-Auth', operation: 'set', value: 'v' }],
    },
    condition: { requestDomains: ['app.bauer-group.com'] },
  } as unknown as ModifyHeaderRule;
}

describe('applyRules', () => {
  beforeEach(() => fakeBrowser.reset());

  it('removes every live rule id before adding the new set', async () => {
    const getDynamicRules = vi
      .spyOn(browser.declarativeNetRequest, 'getDynamicRules')
      .mockResolvedValue([{ id: 7 }, { id: 9 }] as never);
    const updateDynamicRules = vi
      .spyOn(browser.declarativeNetRequest, 'updateDynamicRules')
      .mockResolvedValue(undefined as never);

    const rules = [makeRule(1)];
    await applyRules(rules);

    expect(getDynamicRules).toHaveBeenCalledOnce();
    expect(updateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [7, 9],
      addRules: rules,
    });
  });

  it('still clears live rules when the new set is empty', async () => {
    vi.spyOn(browser.declarativeNetRequest, 'getDynamicRules').mockResolvedValue([
      { id: 3 },
    ] as never);
    const updateDynamicRules = vi
      .spyOn(browser.declarativeNetRequest, 'updateDynamicRules')
      .mockResolvedValue(undefined as never);

    await applyRules([]);

    expect(updateDynamicRules).toHaveBeenCalledWith({ removeRuleIds: [3], addRules: [] });
  });

  it('throws DnrLimitError above the binding ceiling and touches nothing', async () => {
    const updateDynamicRules = vi
      .spyOn(browser.declarativeNetRequest, 'updateDynamicRules')
      .mockResolvedValue(undefined as never);

    const tooMany = Array.from({ length: MAX_UNSAFE_DYNAMIC_RULES + 1 }, (_, i) => makeRule(i + 1));

    await expect(applyRules(tooMany)).rejects.toBeInstanceOf(DnrLimitError);
    await expect(applyRules(tooMany)).rejects.toThrow(String(MAX_UNSAFE_DYNAMIC_RULES));
    expect(updateDynamicRules).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Write `src/lib/permissions/index.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { browser } from 'wxt/browser';
import {
  hasOriginsForPatterns,
  requestOriginsForPatterns,
  removeOriginsForPatterns,
} from './index';
import { patternsToOrigins } from './patterns';

describe('hasOriginsForPatterns', () => {
  beforeEach(() => fakeBrowser.reset());

  it('short-circuits to true when no pattern yields an origin', async () => {
    const contains = vi.spyOn(browser.permissions, 'contains');
    await expect(hasOriginsForPatterns([])).resolves.toBe(true);
    expect(contains).not.toHaveBeenCalled();
  });

  it('delegates to permissions.contains with the derived origins', async () => {
    const contains = vi.spyOn(browser.permissions, 'contains').mockResolvedValue(true as never);
    await expect(hasOriginsForPatterns(['app.bauer-group.com'])).resolves.toBe(true);
    expect(contains).toHaveBeenCalledWith({ origins: patternsToOrigins(['app.bauer-group.com']) });
  });

  it('reports false when the binding rejects', async () => {
    vi.spyOn(browser.permissions, 'contains').mockRejectedValue(new Error('nope') as never);
    await expect(hasOriginsForPatterns(['app.bauer-group.com'])).resolves.toBe(false);
  });
});

describe('requestOriginsForPatterns', () => {
  beforeEach(() => fakeBrowser.reset());

  it('reports false when the user denies the prompt', async () => {
    vi.spyOn(browser.permissions, 'request').mockResolvedValue(false as never);
    await expect(requestOriginsForPatterns(['app.bauer-group.com'])).resolves.toBe(false);
  });

  it('reports false when the binding rejects', async () => {
    vi.spyOn(browser.permissions, 'request').mockRejectedValue(new Error('nope') as never);
    await expect(requestOriginsForPatterns(['app.bauer-group.com'])).resolves.toBe(false);
  });
});

describe('removeOriginsForPatterns', () => {
  beforeEach(() => fakeBrowser.reset());

  it('keeps origins that are still used by another rule', async () => {
    const remove = vi.spyOn(browser.permissions, 'remove').mockResolvedValue(true as never);
    await expect(
      removeOriginsForPatterns(['app.bauer-group.com'], ['app.bauer-group.com']),
    ).resolves.toBe(true);
    expect(remove).not.toHaveBeenCalled();
  });

  it('revokes origins that no remaining rule needs', async () => {
    const remove = vi.spyOn(browser.permissions, 'remove').mockResolvedValue(true as never);
    await expect(removeOriginsForPatterns(['gone.example.com'], [])).resolves.toBe(true);
    expect(remove).toHaveBeenCalledWith({ origins: patternsToOrigins(['gone.example.com']) });
  });
});
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS.

If `applyRules` assertions fail on the exact `updateDynamicRules` argument shape, read `src/lib/dnr/build-rules.ts` and align `makeRule()` with the real `ModifyHeaderRule` type rather than loosening the assertion. If a `permissions` test fails because `patternsToOrigins` returns something unexpected, read `src/lib/permissions/patterns.ts` and its existing `patterns.test.ts` — the derived origins are asserted through the real function precisely so this test cannot drift from it.

- [ ] **Step 7: Run coverage — the threshold must now pass**

Run: `npm run test:coverage`
Expected: PASS, all four metrics ≥ 80 % over `src/lib/**`.

If a metric is short, add cases to the module that is lagging. Do **not** lower the threshold and do **not** widen the `exclude` list.

- [ ] **Step 8: Commit**

```bash
git add src/lib/effective.test.ts src/lib/storage/managed.test.ts src/lib/storage/index.test.ts src/lib/dnr/apply-rules.test.ts src/lib/permissions/index.test.ts
git commit -F - <<'EOF'
test(lib): covered the six modules touching browser APIs

Every module that imported the browser global was untested, which is
also the set where a regression is least likely to be caught by hand:
storage sharding, managed-policy parsing, DNR rule replacement and
host-permission handling all fail silently rather than loudly.

* storage/index: the device-local secret path is asserted from both
  ends — the synced copy must contain the null GUID and never the
  real secret, and switching a rule back to synced must drop the
  local copy.
* dnr/apply-rules: the live rule list is the removal source of
  truth, so the test asserts removeRuleIds comes from
  getDynamicRules and not from the incoming set. The limit case
  asserts updateDynamicRules is never reached.
* permissions: all three entry points swallow binding rejections by
  design; tests pin that they return false rather than throwing,
  and that removeOriginsForPatterns spares origins still in use.
* managed: an invalid policy must yield null, not a partial config.

Origins are asserted through the real patternsToOrigins rather than
literals so these tests cannot drift from the pattern logic.

Coverage over src/lib now clears the 80% threshold introduced in the
previous commit.
EOF
```

---

## Task 5: Code fixes

**Files:**

- Modify: `scripts/sign-crx.mjs:4-5,30-34,42`
- Modify: `docs/deployment/README.md`
- Modify: `docs/deployment/force-install-windows.reg`
- Modify: `docs/deployment/macos-chrome-forcelist.mobileconfig`

**Interfaces:**

- Produces: `sign-crx.mjs` exits non-zero under CI when the signing key is absent — the release pipeline in Task 8 depends on this to avoid green-but-empty releases.

- [ ] **Step 1: Make `sign-crx.mjs` fail loudly under CI**

Replace the header comment (lines 4–5):

```js
// Key source (in order): EXTENSION_PRIVATE_KEY env (CI secret) → .keys/key.pem (local).
// Locally, a missing key SKIPS signing so `npm run build` works without secrets.
// Under CI it is a hard failure: a silently unsigned release ships a GitHub
// Release with no .crx and no updates.xml, and every force-installed client
// keeps the old version with no error anywhere.
```

Replace the missing-key branch (lines 30–34):

```js
const keyPath = resolveKeyPath();
if (!keyPath) {
  const message = '[sign:crx] No signing key (EXTENSION_PRIVATE_KEY / .keys/key.pem).';
  if (process.env.CI) {
    console.error(`${message} Refusing to publish an unsigned release.`);
    process.exit(1);
  }
  console.warn(`${message} Skipping (local build).`);
  process.exit(0);
}
```

- [ ] **Step 2: Fix the stale repo fallback (line 42)**

```js
const repo = process.env.GITHUB_REPOSITORY ?? 'bauer-group/IP-Chrome-HeaderAuth';
```

The old default was `bauer-group/BAUERGROUP.Extension.Chrome.HeaderAuth`, which is neither repo's name — it was the local directory name.

- [ ] **Step 3: Verify both branches**

```bash
CI=1 npm run sign:crx; echo "CI exit: $?"
```

Expected: exit `1` with the "Refusing to publish" message — **unless** `.keys/key.pem` exists locally, in which case it signs. To test the failure path with the key present:

```bash
CI=1 EXTENSION_PRIVATE_KEY= node -e "process.env.CI='1';" ; mv .keys/key.pem .keys/key.pem.bak 2>/dev/null; CI=1 npm run sign:crx; echo "CI exit: $?"; mv .keys/key.pem.bak .keys/key.pem 2>/dev/null
```

Expected: exit `1`.

Then the local path:

```bash
mv .keys/key.pem .keys/key.pem.bak 2>/dev/null; npm run sign:crx; echo "local exit: $?"; mv .keys/key.pem.bak .keys/key.pem 2>/dev/null
```

Expected: exit `0` with "Skipping (local build)".

- [ ] **Step 4: Replace the `<OWNER>/<REPO>` placeholders**

Run: `git grep -n "<OWNER>/<REPO>" -- docs/`

Replace every occurrence with `bauer-group/IP-Chrome-HeaderAuth` in:

- `docs/deployment/README.md`
- `docs/deployment/force-install-windows.reg`
- `docs/deployment/macos-chrome-forcelist.mobileconfig`

Then verify none remain:

Run: `git grep -n "<OWNER>\|<REPO>" -- docs/ || echo "clean"`
Expected: `clean`

- [ ] **Step 5: Commit**

```bash
git add scripts/sign-crx.mjs docs/deployment/
git commit -F - <<'EOF'
fix(release): failed loudly on a missing signing key under CI

sign-crx.mjs exited 0 when no key was found, so a release running
without the EXTENSION_PRIVATE_KEY secret produced a green pipeline
and a GitHub Release with no .crx and no updates.xml. Force-installed
clients would keep the old version and report nothing — the worst
shape a failure can take.

* Under CI a missing key is now exit 1. The soft skip stays for
  local builds, where working without secrets is the point.
* Repo fallback for the updates.xml codebase URL corrected from
  bauer-group/BAUERGROUP.Extension.Chrome.HeaderAuth (the local
  directory name, never a repo) to bauer-group/IP-Chrome-HeaderAuth.
* Replaced the <OWNER>/<REPO> placeholders across the deployment
  docs, the .reg and the .mobileconfig — an admin copying those
  would have deployed a policy pointing at nothing.
EOF
```

---

## Task 6: Repo hygiene files

**Files:**

- Create: `.github/CODEOWNERS`
- Create: `.github/dependabot.yml`
- Create: `.github/config/release/semantic-release.json`
- Create: `.github/config/commitlint.config.js`

**Interfaces:**

- Produces: `.github/config/release/semantic-release.json` — read by `modules-semantic-release.yml` in Task 8.
- Produces: `.github/config/commitlint.config.js` — read by `modules-pr-validation.yml` in Task 8.

Deliberately not created: `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `PULL_REQUEST_TEMPLATE.md`, `ISSUE_TEMPLATE/`. These are inherited from `bauer-group/.github`.

- [ ] **Step 1: Create `.github/CODEOWNERS`**

```
# Every change is reviewed by the core team.
*   @bauer-group/core
```

- [ ] **Step 2: Create `.github/dependabot.yml`**

```yaml
# =============================================================================
# Dependabot Configuration
# =============================================================================
# Watches:
#   1. GitHub Actions versions
#   2. npm dependencies (runtime + build tooling)
#
# COMMIT PREFIXES DECIDE WHETHER AN UPDATE SHIPS
#   release.yml only publishes assets when semantic-release actually cuts a
#   release (`if: needs.release.outputs.release-created == 'true'`). A
#   `chore(...)` update therefore lands on main but never reaches a published
#   .crx — it rides along with whatever releasing commit happens to come next,
#   which for a security patch can be weeks.
#
#   So npm uses `fix(deps)` and cuts its own patch: in a bundled extension
#   nearly everything except pure linting tooling ends up inside the shipped
#   artifact, including the build chain (wxt, vite, tailwind). GitHub Actions
#   stays on `chore(ci)` — it never enters the bundle.
#
#   Grouping bounds the cost: one PR per ecosystem per week, so at most one
#   patch release a week comes from dependency traffic.
# =============================================================================

version: 2
updates:
  # ---------------------------------------------------------------------------
  # GitHub Actions
  # ---------------------------------------------------------------------------
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'sunday'
      time: '06:30'
      timezone: 'Etc/UTC'
    labels:
      - 'dependencies'
      - 'github-actions'
      - 'dependabot'
    commit-message:
      prefix: 'chore(ci)'
    groups:
      github-actions:
        patterns:
          - '*'

  # ---------------------------------------------------------------------------
  # npm
  # ---------------------------------------------------------------------------
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'sunday'
      time: '06:30'
      timezone: 'Etc/UTC'
    labels:
      - 'dependencies'
      - 'npm'
      - 'dependabot'
    commit-message:
      prefix: 'fix(deps)'
    groups:
      npm:
        patterns:
          - '*'
    ignore:
      # TypeScript 7 breaks the lint step: typescript-eslint@8 declares peer
      # `typescript: ">=4.8.4 <6.1.0"`, TS 7 shipped without a stable
      # programmatic API, and typescript-eslint closed TS7 support as
      # "not planned". Revisit only when typescript-eslint ships TS7 support.
      - dependency-name: 'typescript'
        versions: ['>=7']
```

- [ ] **Step 3: Create `.github/config/release/semantic-release.json`**

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/changelog",
      {
        "changelogFile": "CHANGELOG.md"
      }
    ],
    [
      "@semantic-release/npm",
      {
        "npmPublish": false
      }
    ],
    [
      "@semantic-release/git",
      {
        "assets": ["CHANGELOG.md", "package.json", "package-lock.json"],
        "message": "chore(release): ${nextRelease.version}\n\n${nextRelease.notes}"
      }
    ],
    "@semantic-release/github"
  ]
}
```

`npmPublish: false` with `@semantic-release/npm` still present is deliberate: it bumps `package.json` without publishing to a registry. WXT derives the extension's manifest version from `package.json`, so that bump _is_ the version-stamping mechanism — no `@semantic-release/exec` needed.

- [ ] **Step 4: Create `.github/config/commitlint.config.js`**

```js
/**
 * Conventional Commits enforcement, read by
 * bauer-group/automation-templates/.github/workflows/modules-pr-validation.yml.
 *
 * Kept in sync with the root commitlint.config.js, which serves the local
 * simple-git-hooks commit-msg hook. Two files because the two consumers look in
 * different places; without this one the CI commitlint step degrades silently
 * (the module runs it with continue-on-error).
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'body-max-line-length': [0],
  },
};
```

- [ ] **Step 5: Validate the YAML and JSON parse**

```bash
node -e "JSON.parse(require('fs').readFileSync('.github/config/release/semantic-release.json','utf8')); console.log('semantic-release.json OK')"
node --input-type=module -e "import('./.github/config/commitlint.config.js').then(m=>console.log('commitlint OK', Object.keys(m.default)))"
npx --yes js-yaml .github/dependabot.yml > /dev/null && echo "dependabot.yml OK"
```

Expected: three OK lines.

- [ ] **Step 6: Commit**

```bash
git add .github/CODEOWNERS .github/dependabot.yml .github/config/
git commit -F - <<'EOF'
ci(config): added CODEOWNERS, Dependabot and release configuration

Brings the repo onto the org conventions so the reusable workflows
find what they expect.

* dependabot.yml: npm uses fix(deps), GitHub Actions uses chore(ci).
  The prefix is load-bearing — chore(...) never cuts a release, so a
  runtime dependency patch carrying it would sit on main until an
  unrelated releasing commit came along. In a bundled extension the
  build chain ships inside the artifact too, so npm gets fix(deps).
  Grouping bounds this to one PR per ecosystem per week.
* dependabot.yml ignores typescript >=7 — typescript-eslint@8
  declares peer <6.1.0 and closed TS7 support as not planned, so the
  PR would break the lint step. Without the ignore it arrives every
  week looking harmless.
* config/release/semantic-release.json: org convention keeps this
  out of the repo root; the composite action merges it at runtime.
  npmPublish:false bumps package.json without publishing — and since
  WXT derives the manifest version from package.json, that bump is
  the version-stamping mechanism.
* config/commitlint.config.js mirrors the root config, which serves
  the local git hook. modules-pr-validation.yml reads this path and
  degrades silently without it.

SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md and the issue/PR
templates are deliberately absent — they are inherited from
bauer-group/.github.
EOF
```

---

## Task 7: CI gate and PR validation workflows

**Files:**

- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/pr-validation.yml`

**Interfaces:**

- Produces: `ci.yml` with a `workflow_call` trigger — `release.yml` (Task 8) calls it as `uses: ./.github/workflows/ci.yml`.

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
# =============================================================================
# CI Gate
# =============================================================================
# WHAT:  Lint, format, typecheck, test with coverage, audit, and build all three
#        browser targets.
# WHY:   Until now the quality gates lived inside release.yml and therefore ran
#        AFTER code had landed on main. This runs them before a merge is
#        possible, and release.yml reuses this exact file via workflow_call so
#        the pre-merge gate and the release gate cannot drift apart.
# WHEN:  Every PR, every push to main, on demand, and as the release gate.
# =============================================================================

name: 🔍 CI

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, ready_for_review]
  push:
    branches: [main]
  workflow_dispatch:
  workflow_call:

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  gate:
    name: 🧪 Quality Gate
    # nodejs-build.yml calls modules-code-quality.yml, which declares
    # `pull-requests: write`. GitHub validates a called workflow's permissions
    # when the run is CREATED — before any job `if:` — so this is required even
    # though Sonar is off. Omitting the block does not help: a partial block
    # sets every unnamed scope to none, and the repo default is already
    # pull-requests: none. Without it: startup_failure, no job, no log.
    permissions:
      contents: read
      pull-requests: write
    uses: bauer-group/automation-templates/.github/workflows/nodejs-build.yml@main
    with:
      node-version-file: '.nvmrc'
      package-manager: 'npm'
      frozen-lockfile: true

      run-lint: true
      lint-command: 'npm run lint'
      run-format-check: true
      format-command: 'npm run format:check'
      run-typecheck: true
      typecheck-command: 'npm run typecheck'

      run-tests: true
      test-command: 'npm run test:coverage'
      test-coverage: true

      run-audit: true
      audit-level: 'high'

      # WXT builds one browser per invocation; three sequential builds are a few
      # seconds each and keep this on the reusable workflow rather than forcing
      # a hand-rolled matrix.
      build-command: 'npm run build && npm run build:firefox && npm run build:edge'

      # The reusable's default artifact glob is dist|build|lib|coverage. WXT
      # emits .output/, so without this nothing would be uploaded.
      upload-artifacts: true
      artifact-name: 'extension-builds'
      artifact-path: |
        .output/chrome-mv3
        .output/firefox-mv2
        .output/edge-mv3
      artifact-retention-days: 14
      # Node 24 is the floor (.nvmrc); 26 becomes LTS on 2026-10-28 and is
      # tested now so the promotion is a non-event.
      enable-matrix: true
      matrix-node: '["24", "26"]'
    secrets: inherit
```

- [ ] **Step 2: Create `.github/workflows/pr-validation.yml`**

```yaml
# =============================================================================
# Pull Request Gates
# =============================================================================
# WHAT:  Conventional-commit validation, secret scanning, license compliance,
#        and dependency review.
# WHY:   These only make sense with a PR context (they diff head against base),
#        which is why they live here rather than in ci.yml — ci.yml also runs on
#        push and as the release gate, where there is no PR to diff against.
# WHEN:  Every pull request targeting main.
# =============================================================================

name: 🔍 PR Gates

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, ready_for_review]

concurrency:
  group: pr-gates-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  validate:
    name: ✅ Commits, Secrets & Licenses
    permissions:
      contents: read
      pull-requests: write
      security-events: write
      checks: write
    uses: bauer-group/automation-templates/.github/workflows/modules-pr-validation.yml@main
    with:
      enable-commit-lint: true
      enable-security-scan: true
      enable-license-check: true
      fail-on-security-issues: true
      # Reported, not blocking: this repo ships MIT and pulls a broad React /
      # Radix tree whose transitive licence metadata is noisy. A hard fail here
      # would block PRs on someone else's package.json typo.
      fail-on-license-issues: false
    secrets: inherit

  dependency-review:
    name: 🛡️ Dependency Review
    permissions:
      contents: read
      pull-requests: write
    uses: bauer-group/automation-templates/.github/workflows/modules-dependency-review.yml@main
    with:
      fail-on-severity: 'high'
      comment-summary-in-pr: 'on-failure'
      # Runtime scope only. Dev-only advisories do not reach the shipped .crx,
      # and blocking a PR on one trains people to bypass the gate.
      fail-on-scopes: 'runtime'
```

- [ ] **Step 3: Validate the YAML parses**

```bash
for f in .github/workflows/ci.yml .github/workflows/pr-validation.yml; do
  npx --yes js-yaml "$f" > /dev/null && echo "$f OK"
done
```

Expected: two OK lines.

- [ ] **Step 4: Verify against the reusable workflows' real inputs**

Every `with:` key above must exist in the called workflow. Confirm:

```bash
TPL="C:/Projects/Production+Development/Automation-Templates/.github/workflows"
grep -E "^      [a-z-]+:" "$TPL/nodejs-build.yml" | head -60
grep -E "^      [a-z-]+:" "$TPL/modules-pr-validation.yml"
grep -E "^      [a-z-]+:" "$TPL/modules-dependency-review.yml"
```

Expected: every key used above appears in the corresponding list. A typo here surfaces only at run time as `Invalid input`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/pr-validation.yml
git commit -F - <<'EOF'
ci(gate): added a pre-merge CI gate and PR validation

Quality gates previously ran inside release.yml, which triggers on
push to main — so they verified code that had already landed. There
was no pre-merge verification at all.

* ci.yml runs lint, format, typecheck, tests with coverage, a high
  audit and all three browser builds through nodejs-build.yml. It
  declares workflow_call so release.yml reuses this exact file
  rather than a copied `with:` block — the pre-merge gate and the
  release gate are now provably the same thing.
* Node matrix [24, 26]: 24 is the floor from .nvmrc, 26 becomes LTS
  on 2026-10-28 and is tested now so the promotion is a non-event.
* artifact-path is set explicitly. The reusable defaults to
  dist|build|lib|coverage and WXT emits .output/, so the default
  would have uploaded nothing while still reporting success.
* The gate job declares pull-requests: write. nodejs-build.yml calls
  modules-code-quality.yml, whose permissions GitHub validates at
  run creation — before any job if: — so it is required even with
  Sonar off, and a missing block yields startup_failure with no log.
* pr-validation.yml keeps the PR-only gates separate: they diff head
  against base, which ci.yml cannot rely on since it also runs on
  push and as the release gate.
EOF
```

---

## Task 8: Release, CodeQL, AI summary, Dependabot automerge

**Files:**

- Modify: `.github/workflows/release.yml` (full replacement)
- Create: `.github/workflows/codeql.yml`
- Create: `.github/workflows/ai-issue-summary.yml`
- Create: `.github/workflows/dependabot-maintenance.yml`

**Interfaces:**

- Consumes: `ci.yml` (Task 7) via `uses: ./.github/workflows/ci.yml`; `.github/config/release/semantic-release.json` (Task 6); the fail-loud `sign:crx` (Task 5).

- [ ] **Step 1: Replace `.github/workflows/release.yml`**

```yaml
# =============================================================================
# Release
# =============================================================================
# WHAT:  Gate → semantic release → publish signed assets → (optional) Chrome
#        Web Store.
# WHY:   The previous version called `npm version patch` unconditionally, so a
#        feat: never produced a MINOR and a BREAKING CHANGE: never produced a
#        MAJOR — the repo enforced Conventional Commits through commitlint and
#        then discarded the information they carry. Its publish job also
#        re-checked-out the pre-bump commit, so it could package a version
#        other than the one released.
# WHEN:  Push to main, or manual dispatch.
#
# NO concurrency group: semantic-release hard-resets to origin, and cancelling
# it mid-flight can leave a tag pushed with no release attached.
# =============================================================================

name: 🚀 Release

on:
  push:
    branches: [main]
    paths-ignore:
      - '*.md'
      - 'docs/**'
  workflow_dispatch:
    inputs:
      force-release:
        description: 'force create release'
        type: boolean
        default: false

permissions:
  contents: read

jobs:
  gate:
    name: 🔍 Gate
    # Same file the PRs run — see ci.yml. The pull-requests: write grant is the
    # permission ceiling required by nodejs-build.yml further down the chain.
    permissions:
      contents: read
      pull-requests: write
    uses: ./.github/workflows/ci.yml
    secrets: inherit

  release:
    name: 📦 Semantic Release
    needs: [gate]
    if: needs.gate.result == 'success'
    permissions:
      contents: write
      issues: write
      pull-requests: write
    uses: bauer-group/automation-templates/.github/workflows/modules-semantic-release.yml@main
    with:
      target-branch: 'main'
      node-version: '24'
      force-release: ${{ inputs.force-release || false }}
    secrets: inherit

  publish-assets:
    name: 📤 Publish Release Assets
    needs: [release]
    if: needs.release.outputs.release-created == 'true'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      contents: write
    steps:
      - name: 📥 Checkout release tag
        uses: actions/checkout@v7
        with:
          # The released tag, NOT the pushed commit. semantic-release commits
          # the version bump itself, so checking out github.sha here would
          # build the pre-bump tree and ship a .crx whose manifest version does
          # not match the release it is attached to.
          ref: ${{ needs.release.outputs.tag-name }}

      - name: 📦 Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version-file: '.nvmrc'
          cache: npm

      - name: 📚 Install dependencies
        run: npm ci

      - name: 🏗️ Build & zip (Chrome, Firefox, Edge)
        run: |
          npm run build
          npm run zip
          npm run zip:firefox
          npm run zip:edge

      - name: 🔏 Sign CRX + generate updates.xml
        env:
          EXTENSION_PRIVATE_KEY: ${{ secrets.EXTENSION_PRIVATE_KEY }}
          GITHUB_REPOSITORY: ${{ github.repository }}
        # Hard-fails when the secret is absent (CI=true is set by the runner) —
        # a green release with no .crx leaves every force-installed client
        # silently pinned to the old version.
        run: npm run sign:crx

      - name: 📎 Attach assets to the release
        uses: softprops/action-gh-release@v3
        with:
          tag_name: ${{ needs.release.outputs.tag-name }}
          files: |
            .output/*-chrome.zip
            .output/*-firefox.zip
            .output/*-edge.zip
            .output/header-authenticator.crx
            .output/updates.xml

  publish-web-store:
    name: 📤 Publish to Chrome Web Store
    needs: [release, publish-assets]
    # Wired but off. Set the repository variable PUBLISH_WEB_STORE=true and add
    # the CWS_* secrets once a listing exists. v1 was never published from this
    # repo, and v2 pins a new extension ID, so there is nothing to update yet.
    if: needs.release.outputs.release-created == 'true' && vars.PUBLISH_WEB_STORE == 'true'
    # Best-effort: a Web Store hiccup stays a visible red job but must not
    # invalidate a release whose GitHub assets already published correctly.
    continue-on-error: true
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - name: 📥 Checkout release tag
        uses: actions/checkout@v7
        with:
          ref: ${{ needs.release.outputs.tag-name }}

      - name: 📦 Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version-file: '.nvmrc'
          cache: npm

      - name: 📚 Install dependencies
        run: npm ci

      - name: 🏗️ Build & zip (Chrome)
        run: |
          npm run build
          npm run zip

      - name: 📤 Upload to Chrome Web Store
        env:
          CWS_CLIENT_ID: ${{ secrets.CWS_CLIENT_ID }}
          CWS_CLIENT_SECRET: ${{ secrets.CWS_CLIENT_SECRET }}
          CWS_REFRESH_TOKEN: ${{ secrets.CWS_REFRESH_TOKEN }}
          CWS_EXTENSION_ID: ${{ secrets.CWS_EXTENSION_ID }}
        run: |
          ZIP="$(ls .output/*-chrome.zip | head -1)"
          npx --yes chrome-webstore-upload-cli@3 upload \
            --source "$ZIP" \
            --extension-id "$CWS_EXTENSION_ID" \
            --client-id "$CWS_CLIENT_ID" \
            --client-secret "$CWS_CLIENT_SECRET" \
            --refresh-token "$CWS_REFRESH_TOKEN"
```

- [ ] **Step 2: Create `.github/workflows/codeql.yml`**

```yaml
# =============================================================================
# CodeQL Analysis
# =============================================================================
# WHAT:  Static application security testing over the TypeScript/React source.
# WHY:   This extension injects a secret header into outbound requests and holds
#        GUID secrets in extension storage — taint-tracking findings here are
#        directly security-relevant, not box-ticking.
# WHEN:  Push to main, every PR, and weekly (advisories land after the code
#        stops changing, so a schedule catches what push triggers cannot).
# =============================================================================

name: 🛡️ CodeQL

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    # Mondays 04:17 UTC — off the hour to avoid the scheduler's peak queue.
    - cron: '17 4 * * 1'

permissions:
  contents: read

jobs:
  analyze:
    name: 🔎 Analyze
    permissions:
      contents: read
      security-events: write
      actions: read
      packages: read
    uses: bauer-group/automation-templates/.github/workflows/modules-codeql.yml@main
    with:
      languages: 'javascript-typescript'
      queries: 'security-extended'
      # Findings surface in the Security tab rather than blocking merges. A
      # SAST false positive blocking every PR is how teams learn to bypass the
      # gate entirely.
      fail-on-findings: false
```

- [ ] **Step 3: Create `.github/workflows/ai-issue-summary.yml`**

```yaml
name: 🤖 Issue AI Summary

on:
  issues:
    types: [opened]

  pull_request_target:
    types: [opened]

permissions:
  issues: write
  pull-requests: write
  contents: read
  models: read

jobs:
  summarize-new-issue:
    name: 🧠 Generate AI Summary
    if: github.event_name == 'issues' || github.event_name == 'pull_request_target'
    uses: bauer-group/automation-templates/.github/workflows/modules-ai-issue-summary.yml@main
    with:
      summary-type: 'technical'
      add-labels: true
      add-priority: true
      translate: ''
      comment-template: |
        ## AI Analysis

        {summary}

        ---
        *This summary was automatically generated by AI to help with triage and may not be 100% accurate.*
    secrets: inherit
```

- [ ] **Step 4: Create `.github/workflows/dependabot-maintenance.yml`**

```yaml
# =============================================================================
# Dependabot Maintenance
# =============================================================================
# WHAT:  Approves Dependabot PRs and enables GitHub's native auto-merge.
# WHY:   Auto-merge waits for the required status checks, so the CI gate still
#        decides — this only removes the human click from an update that has
#        already proven itself green.
# WHEN:  Every Dependabot pull request.
#
# REQUIRES: repository setting `allow_auto_merge = true` and branch protection
# with required checks on main. Without required checks, auto-merge merges
# immediately and this becomes a rubber stamp.
# =============================================================================

name: 🤖 Dependabot Maintenance

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read

jobs:
  automerge:
    name: 🔀 Auto-merge Dependabot PRs
    if: github.actor == 'dependabot[bot]'
    permissions:
      contents: write
      pull-requests: write
    uses: bauer-group/automation-templates/.github/workflows/docker-maintenance-dependabot.yml@main
    secrets: inherit
```

- [ ] **Step 5: Validate all four parse**

```bash
for f in .github/workflows/*.yml; do
  npx --yes js-yaml "$f" > /dev/null && echo "$f OK"
done
```

Expected: six OK lines (ci, pr-validation, release, codeql, ai-issue-summary, dependabot-maintenance).

- [ ] **Step 6: Verify inputs against the reusables**

```bash
TPL="C:/Projects/Production+Development/Automation-Templates/.github/workflows"
grep -E "^      [a-z-]+:" "$TPL/modules-semantic-release.yml"
grep -E "^      [a-z-]+:" "$TPL/modules-codeql.yml"
grep -nE "outputs:|release-created|tag-name|version:" "$TPL/modules-semantic-release.yml" | head -20
```

Expected: `target-branch`, `node-version`, `force-release` exist; outputs `release-created`, `version`, `tag-name` exist. Confirm `docker-maintenance-dependabot.yml` has an `on: workflow_call` block — if it does **not**, it is a template to copy rather than call, and this workflow must inline its jobs instead.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/
git commit -F - <<'EOF'
ci(release): replaced hand-rolled versioning with semantic-release

The old pipeline ran `npm version patch` unconditionally. commitlint
enforced Conventional Commits on the way in and the release step then
threw that information away: a feat: never produced a MINOR, a
BREAKING CHANGE: never produced a MAJOR. Every release since the repo
began has been a patch regardless of what changed.

* release.yml now gates on ci.yml (the same file PRs run), then hands
  versioning to modules-semantic-release.yml. Nothing bumps or tags
  by hand any more.
* publish-assets checks out the RELEASED TAG rather than github.sha.
  semantic-release commits the version bump itself, so building from
  the pushed commit produced a .crx whose manifest version did not
  match the release it was attached to.
* No concurrency group on this workflow: semantic-release hard-resets
  to origin, and cancelling it mid-flight can leave a tag pushed with
  no release attached.
* publish-web-store stays wired but gated on PUBLISH_WEB_STORE, with
  continue-on-error so a Web Store hiccup cannot invalidate a release
  whose GitHub assets already published.
* codeql.yml: security-extended over javascript-typescript, weekly in
  addition to push/PR — advisories land after code stops changing.
  Findings report to the Security tab rather than blocking merges; a
  SAST false positive that blocks every PR just teaches people to
  bypass the gate.
* ai-issue-summary.yml and dependabot-maintenance.yml adopt the org
  workflows for triage and update automation.
EOF
```

---

## Task 9: Full local verification

**Files:** none — this task only runs things.

**Interfaces:**

- Consumes: everything from Tasks 1–8.
- Produces: the green baseline that makes the PR in Task 11 meaningful.

Nothing has been pushed yet. This is the last chance to find a problem without it being visible on the remote.

- [ ] **Step 1: Clean install from the lockfile**

```bash
rm -rf node_modules
npm ci
```

Expected: completes with no `EBADENGINE` warnings.

- [ ] **Step 2: Run every gate the CI will run**

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test:coverage
npm audit --audit-level=high
npm run build
npm run build:firefox
npm run build:edge
npm run zip
npm run zip:firefox
npm run zip:edge
```

Expected: all exit 0. Coverage clears 80 % on all four metrics.

If `npm audit --audit-level=high` reports something, fix it now — the CI gate runs the same check and will block the PR.

- [ ] **Step 3: Confirm the build outputs match `artifact-path`**

```bash
ls -d .output/*/
```

Expected: directories matching the `artifact-path` globs in `ci.yml` — `chrome-mv3`, `firefox-mv2`, `edge-mv3`. **If the Firefox or Edge directory is named differently, correct `ci.yml` now**, otherwise the artifact upload silently uploads nothing.

- [ ] **Step 4: Confirm the working tree is clean**

Run: `git status --short`
Expected: empty. Build outputs are gitignored.

- [ ] **Step 5: Review the commit series**

Run: `git log --oneline main`
Expected: the three original commits plus the spec commit plus one commit per task above. Every subject in past tense, every non-trivial one with a body.

---

## Task 10: Secret scan across both histories

**Files:** none — produces a report for the human.

**Interfaces:**

- Produces: the go/no-go input for the visibility flip in Task 13.

The repo is about to become public and v1's 27 commits stay reachable through the migration. GitHub's push protection only ever inspected new pushes, never the existing history.

- [ ] **Step 1: Scan the v2 history**

```bash
cd "C:/Projects/Internal-Projects/BAUERGROUP.Extension.Chrome.HeaderAuth.v2"
npx --yes gitleaks@latest detect --source . --log-opts="--all" --redact --report-format json --report-path /tmp/gitleaks-v2.json --exit-code 0
```

- [ ] **Step 2: Scan the v1 history**

```bash
cd "C:/Projects/Internal-Projects/BAUERGROUP.Extension.Chrome.HeaderAuth"
npx --yes gitleaks@latest detect --source . --log-opts="--all" --redact --report-format json --report-path /tmp/gitleaks-v1.json --exit-code 0
```

Read-only. Do not fetch, push, or modify anything in the v1 clone.

- [ ] **Step 3: Summarise both reports**

```bash
node -e "
for (const [name, path] of [['v2','/tmp/gitleaks-v2.json'],['v1','/tmp/gitleaks-v1.json']]) {
  let findings = [];
  try { findings = JSON.parse(require('fs').readFileSync(path,'utf8')) || []; } catch {}
  console.log(name + ': ' + findings.length + ' finding(s)');
  for (const f of findings) console.log('  ' + f.RuleID + '  ' + f.File + ':' + f.StartLine + '  commit ' + String(f.Commit).slice(0,8));
}
"
```

- [ ] **Step 4: Sanity-check the known non-secret**

`wxt.config.ts` contains `EXTENSION_KEY`, which is a **public** key and is meant to be committed. If gitleaks flags it, that is a false positive — note it as such in the report rather than acting on it. The private key lives in `.keys/key.pem`, which is gitignored; confirm it was never committed:

```bash
cd "C:/Projects/Internal-Projects/BAUERGROUP.Extension.Chrome.HeaderAuth.v2"
git log --all --diff-filter=A --name-only --format="%H" -- "*.pem" ".keys/*" | grep -v '^$' || echo "no key material ever committed (v2)"
cd "C:/Projects/Internal-Projects/BAUERGROUP.Extension.Chrome.HeaderAuth"
git log --all --diff-filter=A --name-only --format="%H" -- "*.pem" "*key*" | grep -v '^$' || echo "no key material ever committed (v1)"
```

- [ ] **Step 5: Present the report to the human and STOP**

Report: finding counts per history, each finding's rule/file/commit, and which are false positives with the reason.

**If there is any real finding, stop here and escalate.** A history rewrite is a separate decision with its own trade-offs — it is not a step in this plan. Do not proceed to Task 13 without an explicit go.

---

## Task 11: Remote preparation and migration

**Files:** none in the working tree — this task changes the remote and creates the migration commit.

**Interfaces:**

- Consumes: the green local state from Task 9.
- Produces: an open PR against `main`, and the branch tip SHA that Task 12 tags.

- [ ] **Step 1: Close the three stale Dependabot PRs**

```bash
for n in 1 2 3; do
  gh pr close "$n" -R bauer-group/IP-Chrome-HeaderAuth --delete-branch \
    --comment "Superseded by the v2 rewrite: package.json is replaced wholesale and this dependency no longer exists in the tree. Closing rather than merging — the advisory is not remediated, the code carrying it is removed."
done
```

Verify: `gh pr list -R bauer-group/IP-Chrome-HeaderAuth --state open`
Expected: empty.

- [ ] **Step 2: Rename `master` to `main`**

```bash
gh api -X POST repos/bauer-group/IP-Chrome-HeaderAuth/branches/master/rename -f new_name=main
```

GitHub retargets any open PRs and installs redirects for `master` links. Doing this before the PR means it targets `main` from the start, and `modules-semantic-release.yml`'s `target-branch: 'main'` default applies unmodified.

Verify:

```bash
gh repo view bauer-group/IP-Chrome-HeaderAuth --json defaultBranchRef --jq .defaultBranchRef.name
```

Expected: `main`

- [ ] **Step 3: Attach the remote and fetch**

```bash
cd "C:/Projects/Internal-Projects/BAUERGROUP.Extension.Chrome.HeaderAuth.v2"
git remote add origin https://github.com/bauer-group/IP-Chrome-HeaderAuth.git
git fetch origin
```

Verify the two histories really are disjoint (this is what makes the tree-replace necessary):

```bash
git merge-base HEAD origin/main || echo "no common ancestor — as expected"
```

Expected: `no common ancestor — as expected`

- [ ] **Step 4: Record the local commit SHAs before they are collapsed**

```bash
git log --oneline main | tail -n +1
```

Copy the SHAs and subjects — the migration commit body names them so the collapsed history stays traceable.

- [ ] **Step 5: Create the branch and replace the tree**

```bash
git checkout -b feat/v2-wxt-rewrite origin/main
git rm -rq .
git checkout main -- .
git add -A
```

Verify the staged tree is exactly v2's:

```bash
git diff --cached --stat | tail -1
git status --short | grep -c '^D ' || true
```

Expected: deletions covering v1's files and additions covering v2's. Then confirm the tree matches `main` exactly:

```bash
git write-tree
git rev-parse main^{tree}
```

Expected: **the two hashes are identical.** If they differ, the tree replacement is incomplete — stop and investigate before committing.

- [ ] **Step 6: Create the migration commit**

Substitute the real SHAs from Step 4 into the body.

```bash
git commit -F - <<'EOF'
feat!: replaced the v1 extension with the v2 WXT rewrite

v2 is a ground-up rewrite. It shares the product identity, the
X-BAUERGROUP-Auth header contract and the MIT licence with v1, and
nothing else: v1 was a hand-rolled tsc build with a manual manifest,
v2 is WXT + React 19 + Tailwind 4 + Zod with declarativeNetRequest
rule generation, enterprise policy support via chrome.storage.managed
and a signed self-hosted CRX channel.

The two histories share no ancestor, so this commit replaces the tree
wholesale rather than merging. v1 history stays intact and reachable
below this commit; git bisect crosses the boundary cleanly.

Collapsed from three commits in the standalone v2 repository:
  d5ea84d  feat(extension): scaffolded WXT extension foundation
  5503606  feat(ui): added professional popup and options UI
  2d55715  ci(release): added dual-channel release pipeline and docs
plus the CI/CD, Node 24 and test work done for this migration.

BREAKING CHANGE: the extension ID changed from a per-install random
ID to the pinned jncjhkagdjiiohjfmbpmlemdchbkjaib. v1 installations
do not upgrade in place — managed deployments must update their
ExtensionInstallForcelist entry, and manual installs must be
reinstalled. Stored v1 configuration is not migrated.
EOF
```

- [ ] **Step 7: Push and open the PR**

```bash
git push -u origin feat/v2-wxt-rewrite
gh pr create -R bauer-group/IP-Chrome-HeaderAuth \
  --base main --head feat/v2-wxt-rewrite \
  --title "feat!: v2 WXT rewrite with professional CI/CD" \
  --body "$(cat <<'PRBODY'
Replaces the v1 `tsc`/MV3 extension with the v2 WXT rewrite and brings the repo onto the BAUER GROUP CI/CD standard.

## What changed

**Extension** — ground-up rewrite: WXT + React 19 + Tailwind 4 + Radix + Zod, `declarativeNetRequest` rule generation, enterprise policy via `chrome.storage.managed`, sharded sync storage with device-local secrets, signed self-hosted CRX channel.

**CI/CD** — six workflows consuming `bauer-group/automation-templates`:
- `ci.yml` — the gate: lint, format, typecheck, tests with an 80% coverage threshold, `npm audit --audit-level=high`, and all three browser builds on a Node `[24, 26]` matrix. `release.yml` reuses this exact file via `workflow_call`, so the pre-merge gate and the release gate cannot drift.
- `pr-validation.yml` — commitlint, secret scan, license check, dependency review.
- `release.yml` — semantic-release replaces the previous unconditional `npm version patch`, which meant a `feat:` never cut a MINOR and a `BREAKING CHANGE:` never cut a MAJOR.
- `codeql.yml`, `ai-issue-summary.yml`, `dependabot-maintenance.yml`.

**Runtime** — Node floor raised to 24 (`.nvmrc`). The previous `engines.node: ">=20"` was never satisfiable by this dependency set: `lint-staged@17` requires `>=22.22.1`. Node 20 reached EOL on 2026-04-30.

**Tests** — coverage over `src/lib` gated at 80%. The six modules touching browser APIs were entirely untested.

## Review notes

The diff is large because the tree is replaced wholesale — the two histories share no ancestor. v1 history remains intact and reachable below the migration commit.

`.nvmrc`, `LICENSE`, `.github/` and `docs/superpowers/` are the parts worth reading closely; `src/` is the v2 tree as it stood in the standalone repository plus the test additions.

Design and plan: `docs/superpowers/specs/2026-08-17-cicd-und-remote-migration-design.md` and `docs/superpowers/plans/2026-08-17-cicd-und-remote-migration.md`.

## Not in this PR

- The repository visibility flip (needed for the self-hosted CRX channel to work — Chrome fetches release assets anonymously).
- Chrome Web Store publishing: wired but gated behind `PUBLISH_WEB_STORE`.
PRBODY
)"
```

- [ ] **Step 8: Record the branch tip SHA**

```bash
git rev-parse feat/v2-wxt-rewrite
```

Task 12 tags this exact SHA. Write it down.

---

## Task 12: Validate, tag the baseline, merge, release

**Files:** none — this task drives CI and the release.

**Interfaces:**

- Consumes: the branch tip SHA from Task 11.
- Produces: `v2.0.0` on `main` with assets attached.

- [ ] **Step 1: Wait for CI and read the result**

```bash
gh pr checks -R bauer-group/IP-Chrome-HeaderAuth feat/v2-wxt-rewrite --watch
```

Expected: every check green.

This is the first real execution of the new pipeline. A failure here is the plan working as intended — fix it on the branch, push, and re-run. Common first-run failures and their causes:

- `startup_failure` with no log → a job is missing `pull-requests: write` (see Global Constraints).
- `Invalid input` → a `with:` key does not exist on the called workflow; re-check Task 7 Step 4.
- Empty artifact upload → `artifact-path` does not match the real `.output/` directory names; re-check Task 9 Step 3.

- [ ] **Step 2: Record the exact check names**

```bash
gh pr checks -R bauer-group/IP-Chrome-HeaderAuth feat/v2-wxt-rewrite --json name,state --jq '.[] | .name'
```

Task 13 needs these verbatim for branch protection.

- [ ] **Step 3: Push the `v2.0.0` baseline tag**

```bash
SHA="$(git rev-parse feat/v2-wxt-rewrite)"
git tag -a v2.0.0 "$SHA" -m "v2.0.0 — WXT rewrite baseline

Sets the semantic-release baseline. v1's tags (v0.0.19, v0.0.20,
v0.0.24) remain reachable, so without this tag the first automated
release would compute 1.0.0 from v0.0.24 rather than the 2.0.0 the
product is called."
git push origin v2.0.0
```

Verify: `git ls-remote --tags origin | grep v2.0.0`
Expected: one line, matching `$SHA`.

- [ ] **Step 4: Merge with a MERGE COMMIT**

```bash
gh pr merge -R bauer-group/IP-Chrome-HeaderAuth feat/v2-wxt-rewrite --merge --delete-branch
```

**`--merge`, never `--squash` and never `--rebase`.** Both rewrite the commit SHA, which would leave `v2.0.0` pointing at a commit that never reaches `main`; semantic-release would then baseline off `v0.0.24` and cut `1.0.0` over the top.

Verify the tag is reachable from `main`:

```bash
git fetch origin
git merge-base --is-ancestor v2.0.0 origin/main && echo "v2.0.0 is on main"
```

Expected: `v2.0.0 is on main`

- [ ] **Step 5: Confirm the first release run is a no-op**

```bash
gh run list -R bauer-group/IP-Chrome-HeaderAuth --workflow="🚀 Release" --limit 1
gh run watch -R bauer-group/IP-Chrome-HeaderAuth "$(gh run list -R bauer-group/IP-Chrome-HeaderAuth --workflow='🚀 Release' --limit 1 --json databaseId --jq '.[0].databaseId')"
```

Expected: the gate passes, the release job reports **no new version** ("There are no relevant changes, so no new version is released"), and `publish-assets` is skipped because `release-created` is not `'true'`.

This is correct: the highest reachable tag is `v2.0.0`, and the only commit since it is the merge commit, which carries no conventional type.

- [ ] **Step 6: Create the v2.0.0 GitHub Release with assets**

semantic-release deliberately did not create this one — the baseline tag predates it. Build the assets locally and publish once:

```bash
cd "C:/Projects/Internal-Projects/BAUERGROUP.Extension.Chrome.HeaderAuth.v2"
git checkout main && git pull origin main
npm ci
npm run build && npm run zip && npm run zip:firefox && npm run zip:edge
GITHUB_REPOSITORY=bauer-group/IP-Chrome-HeaderAuth npm run sign:crx

gh release create v2.0.0 -R bauer-group/IP-Chrome-HeaderAuth \
  --title "v2.0.0 — WXT rewrite" \
  --notes "First release of the v2 extension: a ground-up WXT + React 19 rewrite of the v1 \`tsc\` extension.

Shares the product identity, the \`X-BAUERGROUP-Auth\` header contract and the MIT licence with v1, and nothing else.

**Breaking:** the extension ID is now the pinned \`jncjhkagdjiiohjfmbpmlemdchbkjaib\`. v1 installations do not upgrade in place — managed deployments must update their \`ExtensionInstallForcelist\` entry and stored v1 configuration is not migrated.

Every subsequent release is cut automatically by semantic-release from Conventional Commits." \
  .output/*-chrome.zip \
  .output/*-firefox.zip \
  .output/*-edge.zip \
  .output/header-authenticator.crx \
  .output/updates.xml
```

Verify: `gh release view v2.0.0 -R bauer-group/IP-Chrome-HeaderAuth --json assets --jq '.assets[].name'`
Expected: five assets.

---

## Task 13: Repository settings and the visibility flip

**Files:** none — repository configuration only.

**Interfaces:**

- Consumes: the check names from Task 12 Step 2, and the human's go from Task 10 Step 5.

- [ ] **Step 1: Enable auto-merge and branch cleanup**

```bash
gh api -X PATCH repos/bauer-group/IP-Chrome-HeaderAuth \
  -F allow_auto_merge=true \
  -F delete_branch_on_merge=true
```

`allow_auto_merge` is what makes `dependabot-maintenance.yml` functional; without it the workflow approves PRs that then sit unmerged.

- [ ] **Step 2: Set the signing key secret**

```bash
cd "C:/Projects/Internal-Projects/BAUERGROUP.Extension.Chrome.HeaderAuth.v2"
gh secret set EXTENSION_PRIVATE_KEY -R bauer-group/IP-Chrome-HeaderAuth < .keys/key.pem
```

The redirect never prints the key material. Verify it registered without reading it back:

```bash
gh secret list -R bauer-group/IP-Chrome-HeaderAuth
```

Expected: `EXTENSION_PRIVATE_KEY` listed.

**Tell the human:** this key exists only on this workstation and in the secret store. It is the sole determinant of the extension ID; losing it invalidates every force-install policy. A copy belongs in the team password manager — that is a human task the pipeline cannot do.

- [ ] **Step 3: Protect `main` with the real check names**

Use the names recorded in Task 12 Step 2. Substitute them for the placeholders below — do not guess them.

```bash
gh api -X PUT repos/bauer-group/IP-Chrome-HeaderAuth/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["<CHECK NAME 1>", "<CHECK NAME 2>"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

`required_pull_request_reviews: null` and `enforce_admins: false` are deliberate: this is a solo-developer repo, so a review requirement would only block its own author, and semantic-release pushes the release commit directly to `main`. The status checks are the gate that matters.

Verify: `gh api repos/bauer-group/IP-Chrome-HeaderAuth/branches/main/protection --jq '.required_status_checks.contexts'`

- [ ] **Step 4: Flip visibility to public — ONLY after the human approves Task 10's report**

Do not run this without an explicit go on the scan report. Once indexed, always indexed.

```bash
gh api -X PATCH repos/bauer-group/IP-Chrome-HeaderAuth -f visibility=public
```

Verify: `gh repo view bauer-group/IP-Chrome-HeaderAuth --json visibility --jq .visibility`
Expected: `PUBLIC`

- [ ] **Step 5: Verify the self-hosted CRX channel actually works**

This is the whole point of the flip — confirm it rather than assuming it. Fetch anonymously, with no token:

```bash
env -u GITHUB_TOKEN -u GH_TOKEN curl -sSIL -o /dev/null -w '%{http_code}\n' \
  https://github.com/bauer-group/IP-Chrome-HeaderAuth/releases/latest/download/header-authenticator.crx
env -u GITHUB_TOKEN -u GH_TOKEN curl -sSIL -o /dev/null -w '%{http_code}\n' \
  https://github.com/bauer-group/IP-Chrome-HeaderAuth/releases/latest/download/updates.xml
```

Expected: `200` for both. A `404` means the flip did not take effect or the assets are missing from the `latest` release.

- [ ] **Step 6: Confirm the update manifest points at the right place**

```bash
env -u GITHUB_TOKEN -u GH_TOKEN curl -sSL \
  https://github.com/bauer-group/IP-Chrome-HeaderAuth/releases/latest/download/updates.xml
```

Expected: an `<updatecheck codebase="https://github.com/bauer-group/IP-Chrome-HeaderAuth/releases/latest/download/header-authenticator.crx" version="2.0.0"/>` with the extension ID `jncjhkagdjiiohjfmbpmlemdchbkjaib`.

If the `codebase` shows the old `BAUERGROUP.Extension.Chrome.HeaderAuth` fallback, `GITHUB_REPOSITORY` was not set when the assets were signed in Task 12 Step 6 — rebuild and re-upload.

- [ ] **Step 7: Final report to the human**

State plainly: which checks are required on `main`, that the CRX and `updates.xml` return 200 anonymously with the version they report, that `EXTENSION_PRIVATE_KEY` is set, and the outstanding human task (key backup in the password manager). If anything in Steps 5–6 failed, say so with the actual output rather than reporting completion.

---

## Self-Review

**Spec coverage.** §4.1 workflow set → Tasks 7–8. §4.2 permission ceiling → Global Constraints + Task 7 Step 1 comment. §4.3 version mechanics → Task 12 Steps 3–6. §4.4 CRX defect → Task 5 + Task 13 Steps 5–6. §5 file table → Tasks 1, 6, 7, 8. §5.1 action pins → Global Constraints. §5.2 dependabot prefixes → Task 6 Step 2. §6 runtime/deps → Tasks 1–2. §7 testing → Tasks 3–4. §8 migration sequence → Tasks 10–13. §9 risks → Task 10 Step 5 (escalation) and Task 13 Step 2 (key backup).

**Deviation from the spec, recorded deliberately:** §6 lists `@webext-core/fake-browser` among the added dependencies. Task 3 does not add it — `wxt/testing` re-exports it and WXT already depends on it, so a direct dependency would be redundant. Fewer declared dependencies, identical capability.

**Placeholder scan.** Two intentional placeholders remain, both because the value cannot exist until earlier steps run: the branch-tip SHA (Task 11 Step 8 → Task 12 Step 3) and the status-check names (Task 12 Step 2 → Task 13 Step 3). Both name the step that produces them and instruct against guessing.

**Type consistency.** `EffectiveRule`, `Config`, `ManagedConfig`, `ModifyHeaderRule` match `src/lib/schema/config.ts`, `src/lib/storage/managed.ts` and `src/lib/dnr/build-rules.ts`. Function names used in tests — `computeEffectiveConfig`, `ruleStatus`, `loadManagedConfig`, `managedRulesToEffective`, `ManagedConfigSchema`, `loadConfig`, `saveConfig`, `onConfigChanged`, `applyRules`, `DnrLimitError`, `MAX_UNSAFE_DYNAMIC_RULES`, `hasOriginsForPatterns`, `requestOriginsForPatterns`, `removeOriginsForPatterns`, `patternsToOrigins` — all verified against the actual sources. `needs.release.outputs.tag-name` / `release-created` / `version` verified against `modules-semantic-release.yml`.
