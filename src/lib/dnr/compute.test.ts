import { describe, it, expect } from 'vitest';
import { computeRuleInputs } from './compute';
import type { EffectiveConfig, EffectiveRule } from '../schema/config';

function rule(partial: Partial<EffectiveRule>): EffectiveRule {
  return {
    id: 'r1',
    enabled: true,
    label: 'R',
    domainPatterns: ['app.bauer-group.com'],
    headerName: 'X-BAUERGROUP-Auth',
    secretValue: '11111111-1111-1111-1111-111111111111',
    syncSecret: true,
    source: 'user',
    ...partial,
  };
}
const granted = (ids: string[]) => new Set(ids);

describe('computeRuleInputs', () => {
  it('returns nothing when the master switch is off', () => {
    const eff: EffectiveConfig = { masterEnabled: false, rules: [rule({})] };
    expect(computeRuleInputs(eff, granted(['r1']))).toEqual([]);
  });

  it('skips disabled, zero-secret and ungranted rules', () => {
    const eff: EffectiveConfig = {
      masterEnabled: true,
      rules: [
        rule({ id: 'a', enabled: false }),
        rule({ id: 'b', secretValue: '00000000-0000-0000-0000-000000000000' }),
        rule({ id: 'c' }),
      ],
    };
    expect(computeRuleInputs(eff, granted([]))).toEqual([]);
  });

  it('emits granted rules with sequential ids and de-duplicated domains', () => {
    const eff: EffectiveConfig = {
      masterEnabled: true,
      rules: [
        rule({ id: 'a', domainPatterns: ['*.app.bauer-group.com', 'app.bauer-group.com'] }),
        rule({ id: 'b', domainPatterns: ['x.com'] }),
      ],
    };
    const out = computeRuleInputs(eff, granted(['a', 'b']));
    expect(out.map((r) => r.ruleId)).toEqual([1, 2]);
    expect(out[0]!.domains).toEqual(['app.bauer-group.com']);
    expect(out[1]!.domains).toEqual(['x.com']);
  });
});
