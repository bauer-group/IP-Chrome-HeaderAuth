import type { Config, EffectiveConfig, EffectiveRule } from './schema/config';
import { type ManagedConfig, managedRulesToEffective } from './storage/managed';

/**
 * Combine the user config with the (optional) managed policy into the effective
 * config the DNR engine and UI consume. Managed rules come first and are read-only;
 * a managed `masterEnabled` overrides the user's switch when present.
 */
export function computeEffectiveConfig(
  user: Config,
  managed: ManagedConfig | null,
): EffectiveConfig {
  const managedRules = managed ? managedRulesToEffective(managed) : [];
  const userRules: EffectiveRule[] = user.rules.map((rule) => ({ ...rule, source: 'user' }));
  const masterEnabled = managed?.masterEnabled ?? user.masterEnabled;
  return { masterEnabled, rules: [...managedRules, ...userRules] };
}
