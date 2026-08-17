import { describe, it, expect } from 'vitest';
import { planWrite, readConfig, CONFIG_KEY, RULE_PREFIX } from './shard';
import type { Config } from '../schema/config';

function makeConfig(ruleCount: number): Config {
  return {
    schemaVersion: 1,
    masterEnabled: true,
    uiLocale: 'de',
    rules: Array.from({ length: ruleCount }, (_, i) => ({
      id: `id-${i}`,
      enabled: true,
      label: `Rule ${i}`,
      domainPatterns: ['app.bauer-group.com'],
      headerName: 'X-BAUERGROUP-Auth',
      secretValue: '11111111-1111-1111-1111-111111111111',
      syncSecret: true,
    })),
  };
}

describe('planWrite / readConfig', () => {
  it('stores a small config as one item and round-trips', () => {
    const cfg = makeConfig(2);
    const { set, removeKeys } = planWrite(cfg, []);
    expect(Object.keys(set)).toEqual([CONFIG_KEY]);
    expect(removeKeys).toEqual([]);
    const restored = readConfig(set as Record<string, unknown>) as Config;
    expect(restored.rules).toEqual(cfg.rules);
    expect(restored.masterEnabled).toBe(true);
  });

  it('shards a large config into per-rule items and round-trips', () => {
    const cfg = makeConfig(400);
    const { set } = planWrite(cfg, []);
    expect(Object.keys(set).length).toBeGreaterThan(1);
    expect(set[RULE_PREFIX + 'id-0']).toBeDefined();
    const restored = readConfig(set as Record<string, unknown>) as Config;
    expect(restored.rules).toHaveLength(400);
    expect(restored.rules[0]).toMatchObject({ id: 'id-0' });
  });

  it('removes stale shard keys when shrinking to a single item', () => {
    const cfg = makeConfig(1);
    const { removeKeys } = planWrite(cfg, [CONFIG_KEY, RULE_PREFIX + 'old']);
    expect(removeKeys).toContain(RULE_PREFIX + 'old');
  });
});
