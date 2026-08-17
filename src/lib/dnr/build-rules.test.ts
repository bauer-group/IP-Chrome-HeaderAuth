import { describe, it, expect } from 'vitest';
import { buildRule, DNR_RESOURCE_TYPES } from './build-rules';

describe('buildRule', () => {
  it('builds a modifyHeaders/set rule with the expected shape', () => {
    const rule = buildRule({
      ruleId: 7,
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
