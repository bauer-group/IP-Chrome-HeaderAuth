import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { browser } from 'wxt/browser';
import { applyRules, DnrLimitError, MAX_UNSAFE_DYNAMIC_RULES } from './apply-rules';
import { buildRule } from './build-rules';

// Built through buildRule rather than a hand-written literal so these tests
// cannot drift from the real ModifyHeaderRule shape.
function makeRule(ruleId: number) {
  return buildRule({
    ruleId,
    sourceId: `r${ruleId}`,
    headerName: 'X-BAUERGROUP-Auth',
    secretValue: '11111111-1111-1111-1111-111111111111',
    domains: ['app.bauer-group.com'],
  });
}

describe('applyRules', () => {
  beforeEach(() => fakeBrowser.reset());

  it('removes every live rule id before adding the new set', async () => {
    const getDynamicRules = vi
      .spyOn(browser.declarativeNetRequest, 'getDynamicRules')
      .mockResolvedValue([{ id: 7 }, { id: 9 }] as never);
    const updateDynamicRules = vi
      .spyOn(browser.declarativeNetRequest, 'updateDynamicRules')
      .mockResolvedValue(undefined as never);

    const rules = [makeRule(1)];
    await applyRules(rules);

    expect(getDynamicRules).toHaveBeenCalledOnce();
    expect(updateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [7, 9],
      addRules: rules,
    });
  });

  it('still clears live rules when the new set is empty', async () => {
    vi.spyOn(browser.declarativeNetRequest, 'getDynamicRules').mockResolvedValue([
      { id: 3 },
    ] as never);
    const updateDynamicRules = vi
      .spyOn(browser.declarativeNetRequest, 'updateDynamicRules')
      .mockResolvedValue(undefined as never);

    await applyRules([]);

    expect(updateDynamicRules).toHaveBeenCalledWith({ removeRuleIds: [3], addRules: [] });
  });

  it('throws DnrLimitError above the binding ceiling and touches nothing', async () => {
    const getDynamicRules = vi.spyOn(browser.declarativeNetRequest, 'getDynamicRules');
    const updateDynamicRules = vi
      .spyOn(browser.declarativeNetRequest, 'updateDynamicRules')
      .mockResolvedValue(undefined as never);

    const tooMany = Array.from({ length: MAX_UNSAFE_DYNAMIC_RULES + 1 }, (_, i) => makeRule(i + 1));

    await expect(applyRules(tooMany)).rejects.toBeInstanceOf(DnrLimitError);
    await expect(applyRules(tooMany)).rejects.toThrow(String(MAX_UNSAFE_DYNAMIC_RULES));
    // The guard runs before any binding call — nothing is read, nothing written.
    expect(getDynamicRules).not.toHaveBeenCalled();
    expect(updateDynamicRules).not.toHaveBeenCalled();
  });

  it('accepts exactly the ceiling', async () => {
    vi.spyOn(browser.declarativeNetRequest, 'getDynamicRules').mockResolvedValue([] as never);
    const updateDynamicRules = vi
      .spyOn(browser.declarativeNetRequest, 'updateDynamicRules')
      .mockResolvedValue(undefined as never);

    const atLimit = Array.from({ length: MAX_UNSAFE_DYNAMIC_RULES }, (_, i) => makeRule(i + 1));

    await expect(applyRules(atLimit)).resolves.toBeUndefined();
    expect(updateDynamicRules).toHaveBeenCalledOnce();
  });
});
