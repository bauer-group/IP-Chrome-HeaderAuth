import type { EffectiveConfig } from '../schema/config';
import type { RuleInput } from './build-rules';
import { patternToRequestDomain } from '../permissions/patterns';

const ZERO_GUID = '00000000-0000-0000-0000-000000000000';

/**
 * Turn the effective config into DNR rule inputs with deterministic sequential ids.
 * Pure: the caller pre-resolves which rules currently have their host permission
 * granted and passes the id set in. A rule is emitted only when it is enabled, has
 * a real secret, is granted, and has at least one domain.
 */
export function computeRuleInputs(
  effective: EffectiveConfig,
  grantedRuleIds: ReadonlySet<string>,
): RuleInput[] {
  if (!effective.masterEnabled) return [];

  const inputs: RuleInput[] = [];
  let nextId = 1;

  for (const rule of effective.rules) {
    if (!rule.enabled) continue;
    if (!rule.secretValue || rule.secretValue === ZERO_GUID) continue;
    if (!grantedRuleIds.has(rule.id)) continue;

    const domains = [...new Set(rule.domainPatterns.map(patternToRequestDomain))].filter(Boolean);
    if (domains.length === 0) continue;

    inputs.push({
      ruleId: nextId++,
      sourceId: rule.id,
      headerName: rule.headerName,
      secretValue: rule.secretValue,
      domains,
    });
  }

  return inputs;
}
