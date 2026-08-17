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
    expect(effective.rules[0]?.source).toBe('user');
    expect(effective.masterEnabled).toBe(true);
  });

  it('places managed rules before user rules', () => {
    const managed = ManagedConfigSchema.parse({
      rules: [{ label: 'Corp', domainPatterns: ['corp.example.com'], secretValue: SECRET }],
    });
    const effective = computeEffectiveConfig(userConfig(), managed);
    expect(effective.rules.map((rule) => rule.source)).toEqual(['managed', 'user']);
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
