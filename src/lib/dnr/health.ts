import { browser } from 'wxt/browser';

/**
 * What the DNR engine actually did, last time the background tried.
 *
 * The UI used to derive "active" from `enabled && granted` alone, which is a claim
 * about *intent*, not about the engine. Every way a rule could be computed away or
 * refused — a null-GUID secret, a domain list that reduces to nothing, an
 * `updateDynamicRules` rejection — left the badge green. This record is the missing
 * feedback edge: the background states which rules it installed and why it failed,
 * and the UI reports that instead of guessing.
 */
export interface DnrHealth {
  /** Internal ids (`Rule.id`) of the rules present in the DNR engine after the last apply. */
  appliedRuleIds: string[];
  /** Message of the failure that prevented the last apply, or `null` when it succeeded. */
  error: string | null;
  /** `Date.now()` of the last apply attempt. */
  at: number;
}

/** Key in `storage.local`. Deliberately namespaced away from the `secret:` entries. */
export const HEALTH_KEY = 'dnr:health';

function isHealth(value: unknown): value is DnrHealth {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v['appliedRuleIds']) &&
    v['appliedRuleIds'].every((id) => typeof id === 'string') &&
    (v['error'] === null || typeof v['error'] === 'string') &&
    typeof v['at'] === 'number'
  );
}

/** Record the outcome of an apply. Never throws — health reporting must not break the apply. */
export async function writeHealth(health: DnrHealth): Promise<void> {
  try {
    await browser.storage.local.set({ [HEALTH_KEY]: health });
  } catch {
    // Storage is full or unavailable; the rules themselves are unaffected.
  }
}

/**
 * Read the last recorded outcome. `null` means "the background has not reported yet"
 * — an absence of knowledge, which callers must not render as a failure.
 */
export async function readHealth(): Promise<DnrHealth | null> {
  try {
    const raw = (await browser.storage.local.get(HEALTH_KEY)) as Record<string, unknown>;
    const value = raw[HEALTH_KEY];
    return isHealth(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Is this rule live in the engine? `null` propagates the unknown state so a UI that
 * loads before the first background report stays silent rather than crying wolf.
 */
export function isRuleApplied(health: DnrHealth | null, ruleId: string): boolean | null {
  if (!health) return null;
  return health.appliedRuleIds.includes(ruleId);
}

/** Normalise a thrown value into something worth putting in front of a user. */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Unknown error';
}
