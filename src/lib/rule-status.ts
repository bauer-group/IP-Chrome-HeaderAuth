import type { EffectiveRule } from './schema/config';

export type RuleStatusKey = 'active' | 'needs-access' | 'disabled';

/** Derive the display status of an effective rule from its enabled + granted state. */
export function ruleStatus(
  rule: EffectiveRule,
  granted: boolean,
): { key: RuleStatusKey; managed: boolean } {
  const managed = rule.source === 'managed';
  if (!rule.enabled) return { key: 'disabled', managed };
  if (!granted) return { key: 'needs-access', managed };
  return { key: 'active', managed };
}
