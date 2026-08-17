import { browser } from 'wxt/browser';
import type { ModifyHeaderRule } from './build-rules';

/** `modifyHeaders` is an "unsafe" DNR action — the binding ceiling is 5000 dynamic rules. */
export const MAX_UNSAFE_DYNAMIC_RULES = 5000;

export class DnrLimitError extends Error {
  constructor(public readonly count: number) {
    super(`Too many dynamic rules: ${count} exceeds the limit of ${MAX_UNSAFE_DYNAMIC_RULES}`);
    this.name = 'DnrLimitError';
  }
}

type UpdateArg = Parameters<typeof browser.declarativeNetRequest.updateDynamicRules>[0];

/**
 * Replace ALL current dynamic rules with the freshly computed set. The live rule
 * list is the source of truth for removal (robust against config drift between runs).
 */
export async function applyRules(rules: ModifyHeaderRule[]): Promise<void> {
  if (rules.length > MAX_UNSAFE_DYNAMIC_RULES) throw new DnrLimitError(rules.length);
  const existing = await browser.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((rule) => rule.id);
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: rules,
  } as unknown as UpdateArg);
}
