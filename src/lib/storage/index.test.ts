import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { loadConfig, saveConfig, onConfigChanged } from './index';
import { HEALTH_KEY } from '../dnr/health';
import type { Config, Rule } from '../schema/config';

const SECRET = '11111111-1111-1111-1111-111111111111';
const ZERO_GUID = '00000000-0000-0000-0000-000000000000';

function makeRule(id: string, syncSecret: boolean): Rule {
  return {
    id,
    enabled: true,
    label: 'Rule',
    domainPatterns: ['app.bauer-group.com'],
    headerName: 'X-BAUERGROUP-Auth',
    secretValue: SECRET,
    syncSecret,
  };
}

function makeConfig(syncSecret: boolean): Config {
  return {
    schemaVersion: 1,
    masterEnabled: true,
    uiLocale: 'de',
    rules: [makeRule('r1', syncSecret)],
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
    expect(loaded.rules[0]?.secretValue).toBe(SECRET);
    expect(loaded.rules[0]?.syncSecret).toBe(true);
  });

  it('keeps a device-local secret out of sync storage', async () => {
    await saveConfig(makeConfig(false));

    const sync = (await fakeBrowser.storage.sync.get(null)) as Record<string, unknown>;
    expect(JSON.stringify(sync)).not.toContain(SECRET);
    expect(JSON.stringify(sync)).toContain(ZERO_GUID);

    const local = (await fakeBrowser.storage.local.get(null)) as Record<string, unknown>;
    expect(local['secret:r1']).toBe(SECRET);

    const loaded = await loadConfig();
    expect(loaded.rules[0]?.secretValue).toBe(SECRET);
  });

  it('substitutes the null GUID when the device-local secret is missing', async () => {
    await saveConfig(makeConfig(false));
    await fakeBrowser.storage.local.remove('secret:r1');
    const loaded = await loadConfig();
    expect(loaded.rules[0]?.secretValue).toBe(ZERO_GUID);
  });

  it('drops the device-local copy when a rule switches back to synced', async () => {
    await saveConfig(makeConfig(false));
    await saveConfig(makeConfig(true));
    const local = (await fakeBrowser.storage.local.get(null)) as Record<string, unknown>;
    expect(local['secret:r1']).toBeUndefined();
  });

  it('removes stale sync keys when the rule set shrinks', async () => {
    const many: Config = {
      ...makeConfig(true),
      rules: Array.from({ length: 300 }, (_, i) => makeRule(`r${i}`, true)),
    };
    await saveConfig(many);
    const beforeKeys = Object.keys(await fakeBrowser.storage.sync.get(null));

    await saveConfig(makeConfig(true));
    const afterKeys = Object.keys(await fakeBrowser.storage.sync.get(null));

    expect(beforeKeys.length).toBeGreaterThan(afterKeys.length);
    const loaded = await loadConfig();
    expect(loaded.rules).toHaveLength(1);
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

  it('fires on local changes too', async () => {
    let calls = 0;
    const unsubscribe = onConfigChanged(() => {
      calls += 1;
    });

    await fakeBrowser.storage.local.set({ 'secret:r1': SECRET });
    expect(calls).toBeGreaterThan(0);
    unsubscribe();
  });

  it('ignores a change that only touches the DNR health record', async () => {
    // The health record is written BY the refresh this callback triggers. Reacting
    // to it would spin the service worker in a write -> notify -> write loop.
    let calls = 0;
    const unsubscribe = onConfigChanged(() => {
      calls += 1;
    });

    await fakeBrowser.storage.local.set({
      [HEALTH_KEY]: { appliedRuleIds: [], error: null, at: 1 },
    });
    expect(calls).toBe(0);
    unsubscribe();
  });

  it('still fires when a real key changes alongside the health record', async () => {
    let calls = 0;
    const unsubscribe = onConfigChanged(() => {
      calls += 1;
    });

    await fakeBrowser.storage.local.set({
      [HEALTH_KEY]: { appliedRuleIds: [], error: null, at: 2 },
      'secret:r1': SECRET,
    });
    expect(calls).toBeGreaterThan(0);
    unsubscribe();
  });
});
