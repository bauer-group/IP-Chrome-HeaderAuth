import type { EffectiveRule } from './schema/config';

export type RuleStatusKey = 'active' | 'needs-access' | 'disabled' | 'inactive';

/**
 * Derive the display status of an effective rule.
 *
 * `enabled` and `granted` are statements of intent; `applied` is what the DNR engine
 * reports back. Only the third can distinguish a rule that works from one that was
 * computed away (null-GUID secret, empty domain list) or refused by
 * `updateDynamicRules`. `applied === null` means the background has not reported yet —
 * an unknown, which must not be rendered as a failure.
 */
export function ruleStatus(
  rule: EffectiveRule,
  granted: boolean,
  applied: boolean | null = null,
): { key: RuleStatusKey; managed: boolean } {
  const managed = rule.source === 'managed';
  if (!rule.enabled) return { key: 'disabled', managed };
  if (!granted) return { key: 'needs-access', managed };
  if (applied === false) return { key: 'inactive', managed };
  return { key: 'active', managed };
}
