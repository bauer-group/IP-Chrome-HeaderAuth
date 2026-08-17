import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { loadConfig, onConfigChanged } from '../lib/storage';
import { loadManagedConfig } from '../lib/storage/managed';
import { computeEffectiveConfig } from '../lib/effective';
import { computeRuleInputs } from '../lib/dnr/compute';
import { buildRule } from '../lib/dnr/build-rules';
import { applyRules } from '../lib/dnr/apply-rules';
import { patternsToOrigins } from '../lib/permissions';

/** Recompute the effective config and apply the resulting declarativeNetRequest rules. */
async function refreshRules(): Promise<void> {
  const [user, managed] = await Promise.all([loadConfig(), loadManagedConfig()]);
  const effective = computeEffectiveConfig(user, managed);

  // A rule only takes effect once its host permission is granted, so filter to granted rules.
  const grantChecks = await Promise.all(
    effective.rules.map(async (rule) => {
      const origins = patternsToOrigins(rule.domainPatterns);
      const granted = await browser.permissions.contains({ origins }).catch(() => false);
      return granted ? rule.id : null;
    }),
  );
  const grantedRuleIds = new Set(grantChecks.filter((id): id is string => id !== null));

  const inputs = computeRuleInputs(effective, grantedRuleIds);
  await applyRules(inputs.map(buildRule));
}

export default defineBackground(() => {
  void refreshRules();
  onConfigChanged(() => void refreshRules());
  browser.permissions.onAdded.addListener(() => void refreshRules());
  browser.permissions.onRemoved.addListener(() => void refreshRules());
});
