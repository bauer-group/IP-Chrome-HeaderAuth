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
