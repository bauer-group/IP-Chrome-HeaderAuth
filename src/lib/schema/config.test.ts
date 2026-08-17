import { describe, it, expect } from 'vitest';
import { RuleSchema, parseConfig, DEFAULT_CONFIG, createBlankRule } from './config';

const validRule = {
  id: crypto.randomUUID(),
  label: 'Apps',
  domainPatterns: ['app.bauer-group.com'],
  secretValue: '11111111-1111-1111-1111-111111111111',
};

describe('RuleSchema', () => {
  it('applies defaults for omitted fields', () => {
    const r = RuleSchema.parse(validRule);
    expect(r.enabled).toBe(true);
    expect(r.headerName).toBe('X-BAUERGROUP-Auth');
    expect(r.syncSecret).toBe(true);
  });
  it('rejects a non-GUID secret', () => {
    expect(RuleSchema.safeParse({ ...validRule, secretValue: 'nope' }).success).toBe(false);
  });
  it('rejects an empty domain list', () => {
    expect(RuleSchema.safeParse({ ...validRule, domainPatterns: [] }).success).toBe(false);
  });
  it('rejects a domain pattern with scheme', () => {
    expect(RuleSchema.safeParse({ ...validRule, domainPatterns: ['http://x'] }).success).toBe(
      false,
    );
  });
  it('accepts a wildcard subdomain', () => {
    expect(
      RuleSchema.safeParse({ ...validRule, domainPatterns: ['*.bauer-group.com'] }).success,
    ).toBe(true);
  });
});

describe('parseConfig', () => {
  it('falls back to defaults for invalid input', () => {
    expect(parseConfig('garbage')).toEqual(DEFAULT_CONFIG);
  });
  it('parses a valid config', () => {
    const cfg = parseConfig({ rules: [validRule] });
    expect(cfg.rules).toHaveLength(1);
    expect(cfg.masterEnabled).toBe(true);
  });
});

describe('createBlankRule', () => {
  it('generates a fresh id each call', () => {
    expect(createBlankRule().id).not.toBe(createBlankRule().id);
  });
});
