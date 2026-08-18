import { describe, it, expect } from 'vitest';
import {
  patternToRequestDomain,
  patternToOrigins,
  patternToWebSocketOrigins,
  patternsToOrigins,
  patternsToWebSocketOrigins,
} from './patterns';

describe('patternToRequestDomain', () => {
  it('strips the wildcard prefix', () => {
    expect(patternToRequestDomain('*.bauer-group.com')).toBe('bauer-group.com');
  });
  it('lowercases and keeps a bare domain', () => {
    expect(patternToRequestDomain('App.Bauer-Group.com')).toBe('app.bauer-group.com');
  });
});

describe('patternToOrigins', () => {
  it('produces only the https origin for a bare domain', () => {
    expect(patternToOrigins('app.bauer-group.com')).toEqual(['https://*.app.bauer-group.com/*']);
  });
  it('keeps an existing wildcard', () => {
    expect(patternToOrigins('*.x.com')).toEqual(['https://*.x.com/*']);
  });
  it('never emits a scheme Chrome does not document, so grants cannot silently fail', () => {
    const schemes = ['x.com', '*.y.com', 'App.Z.com'].flatMap(patternToOrigins).map((o) => {
      const [scheme] = o.split('://');
      return scheme;
    });
    expect(new Set(schemes)).toEqual(new Set(['https']));
  });
});

describe('patternToWebSocketOrigins', () => {
  it('produces the wss origin for the same host', () => {
    expect(patternToWebSocketOrigins('app.bauer-group.com')).toEqual([
      'wss://*.app.bauer-group.com/*',
    ]);
  });
  it('keeps an existing wildcard', () => {
    expect(patternToWebSocketOrigins('*.x.com')).toEqual(['wss://*.x.com/*']);
  });
  it('targets exactly the host its https counterpart does', () => {
    const host = (origin: string) => origin.split('://')[1];
    expect(patternToWebSocketOrigins('x.com').map(host)).toEqual(
      patternToOrigins('x.com').map(host),
    );
  });
});

describe('patternsToOrigins', () => {
  it('flattens and de-duplicates', () => {
    expect(patternsToOrigins(['x.com', 'x.com'])).toEqual(['https://*.x.com/*']);
  });
});

describe('patternsToWebSocketOrigins', () => {
  it('flattens and de-duplicates', () => {
    expect(patternsToWebSocketOrigins(['x.com', 'x.com'])).toEqual(['wss://*.x.com/*']);
  });
});
