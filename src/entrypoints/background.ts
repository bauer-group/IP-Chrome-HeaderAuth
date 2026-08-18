import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { loadConfig, onConfigChanged } from '../lib/storage';
import { loadManagedConfig } from '../lib/storage/managed';
import { computeEffectiveConfig } from '../lib/effective';
import { computeRuleInputs } from '../lib/dnr/compute';
import { buildRule } from '../lib/dnr/build-rules';
import { applyRules } from '../lib/dnr/apply-rules';
import { describeError, writeHealth } from '../lib/dnr/health';
import { patternsToOrigins } from '../lib/permissions';

/**
 * Recompute the effective config and apply the resulting declarativeNetRequest rules,
 * then record what actually landed.
 *
 * Every exit path writes health. A `void refreshRules()` whose promise rejects is an
 * unhandled rejection in a service worker — nothing logs it, nothing retries, and the
 * UI keeps showing rules as active while the engine holds none. Reporting the outcome
 * is the difference between a bug that is seen and one that is lived with.
 */
async function refreshRules(): Promise<void> {
  try {
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

    await writeHealth({
      appliedRuleIds: inputs.map((input) => input.sourceId),
      error: null,
      at: Date.now(),
    });
  } catch (error) {
    // updateDynamicRules is atomic, so the engine kept whatever it had — but that set
    // reflects a config we can no longer map. Claiming nothing is applied is the
    // conservative report; the error text is what the user actually needs.
    await writeHealth({ appliedRuleIds: [], error: describeError(error), at: Date.now() });
  }
}

export default defineBackground(() => {
  void refreshRules();
  onConfigChanged(() => void refreshRules());
  browser.permissions.onAdded.addListener(() => void refreshRules());
  browser.permissions.onRemoved.addListener(() => void refreshRules());
});
