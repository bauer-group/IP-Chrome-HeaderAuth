import { describe, it, expect } from 'vitest';
import { buildRule, DNR_RESOURCE_TYPES } from './build-rules';

describe('buildRule', () => {
  it('builds a modifyHeaders/set rule with the expected shape', () => {
    const rule = buildRule({
      ruleId: 7,
      sourceId: 'r1',
      headerName: 'X-BAUERGROUP-Auth',
      secretValue: '11111111-1111-1111-1111-111111111111',
      domains: ['app.bauer-group.com'],
    });
    expect(rule.id).toBe(7);
    expect(rule.priority).toBe(1);
    expect(rule.action.type).toBe('modifyHeaders');
    expect(rule.action.requestHeaders[0]).toEqual({
      header: 'X-BAUERGROUP-Auth',
      operation: 'set',
      value: '11111111-1111-1111-1111-111111111111',
    });
    expect(rule.condition.requestDomains).toEqual(['app.bauer-group.com']);
    expect(rule.condition.resourceTypes).toEqual([...DNR_RESOURCE_TYPES]);
  });
});

describe('DNR_RESOURCE_TYPES', () => {
  /**
   * Regression guard for the v1 → v2 regression: v1 attached the header to
   * `Object.values(chrome.declarativeNetRequest.ResourceType)`, v2 shipped a
   * hand-picked subset — so SPA subresources (script/stylesheet/image/font)
   * reached header-protected origins WITHOUT the auth header and were rejected.
   * This list is Chrome's full ResourceType enum and must stay complete.
   */
  const CHROME_RESOURCE_TYPES = [
    'main_frame',
    'sub_frame',
    'stylesheet',
    'script',
    'image',
    'font',
    'object',
    'xmlhttprequest',
    'ping',
    'csp_report',
    'media',
    'websocket',
    'webtransport',
    'webbundle',
    'other',
  ];

  it('covers every Chrome resource type', () => {
    expect([...DNR_RESOURCE_TYPES].sort()).toEqual([...CHROME_RESOURCE_TYPES].sort());
  });
});
