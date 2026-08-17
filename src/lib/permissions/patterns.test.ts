import { describe, it, expect } from 'vitest';
import { patternToRequestDomain, patternToOrigins, patternsToOrigins } from './patterns';

describe('patternToRequestDomain', () => {
  it('strips the wildcard prefix', () => {
    expect(patternToRequestDomain('*.bauer-group.com')).toBe('bauer-group.com');
  });
  it('lowercases and keeps a bare domain', () => {
    expect(patternToRequestDomain('App.Bauer-Group.com')).toBe('app.bauer-group.com');
  });
});

describe('patternToOrigins', () => {
  it('produces https + wss wildcard origins for a bare domain', () => {
    expect(patternToOrigins('app.bauer-group.com')).toEqual([
      'https://*.app.bauer-group.com/*',
      'wss://*.app.bauer-group.com/*',
    ]);
  });
  it('keeps an existing wildcard', () => {
    expect(patternToOrigins('*.x.com')).toEqual(['https://*.x.com/*', 'wss://*.x.com/*']);
  });
});

describe('patternsToOrigins', () => {
  it('flattens and de-duplicates', () => {
    expect(patternsToOrigins(['x.com', 'x.com'])).toEqual(['https://*.x.com/*', 'wss://*.x.com/*']);
  });
});
