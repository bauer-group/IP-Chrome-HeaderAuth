import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { loadManagedConfig, managedRulesToEffective, ManagedConfigSchema } from './managed';

const SECRET = '11111111-1111-1111-1111-111111111111';

describe('loadManagedConfig', () => {
  beforeEach(() => fakeBrowser.reset());

  it('returns null when no policy is provisioned', async () => {
    await expect(loadManagedConfig()).resolves.toBeNull();
  });

  it('parses a provisioned policy and defaults the header name', async () => {
    await fakeBrowser.storage.managed.set({
      masterEnabled: true,
      rules: [{ label: 'Corp', domainPatterns: ['*.bauer-group.com'], secretValue: SECRET }],
    });
    const config = await loadManagedConfig();
    expect(config?.masterEnabled).toBe(true);
    expect(config?.rules).toHaveLength(1);
    expect(config?.rules[0]?.headerName).toBe('X-BAUERGROUP-Auth');
    expect(config?.rules[0]?.enabled).toBe(true);
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
    expect(effective.map((rule) => rule.id)).toEqual(['managed-0', 'managed-1']);
    expect(effective.every((rule) => rule.source === 'managed')).toBe(true);
    expect(effective.every((rule) => rule.syncSecret)).toBe(true);
    expect(effective[1]?.enabled).toBe(false);
  });

  it('returns an empty list when the policy has no rules', () => {
    expect(managedRulesToEffective(ManagedConfigSchema.parse({}))).toEqual([]);
  });
});
