import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { browser } from 'wxt/browser';
import {
  HEALTH_KEY,
  describeError,
  isRuleApplied,
  readHealth,
  writeHealth,
  type DnrHealth,
} from './health';

const OK: DnrHealth = { appliedRuleIds: ['a', 'b'], error: null, at: 1_700_000_000_000 };

describe('writeHealth / readHealth', () => {
  beforeEach(() => fakeBrowser.reset());

  it('round-trips a health record', async () => {
    await writeHealth(OK);
    await expect(readHealth()).resolves.toEqual(OK);
  });

  it('reports null before the background has ever run', async () => {
    await expect(readHealth()).resolves.toBeNull();
  });

  it('rejects a malformed record rather than trusting it', async () => {
    await browser.storage.local.set({ [HEALTH_KEY]: { appliedRuleIds: 'nope', at: 'soon' } });
    await expect(readHealth()).resolves.toBeNull();
  });

  it('never throws when storage refuses the write', async () => {
    vi.spyOn(browser.storage.local, 'set').mockRejectedValue(new Error('quota') as never);
    await expect(writeHealth(OK)).resolves.toBeUndefined();
  });

  it('reports null when storage refuses the read', async () => {
    vi.spyOn(browser.storage.local, 'get').mockRejectedValue(new Error('nope') as never);
    await expect(readHealth()).resolves.toBeNull();
  });
});

describe('isRuleApplied', () => {
  it('propagates unknown when nothing has been reported', () => {
    expect(isRuleApplied(null, 'a')).toBeNull();
  });

  it('confirms a rule the engine holds', () => {
    expect(isRuleApplied(OK, 'a')).toBe(true);
  });

  it('denies a rule the engine does not hold', () => {
    expect(isRuleApplied(OK, 'zzz')).toBe(false);
  });

  it('denies every rule after a failed apply', () => {
    const failed: DnrHealth = { appliedRuleIds: [], error: 'boom', at: 1 };
    expect(isRuleApplied(failed, 'a')).toBe(false);
  });
});

describe('describeError', () => {
  it('uses the message of an Error', () => {
    expect(describeError(new Error('Invalid resource type'))).toBe('Invalid resource type');
  });

  it('passes a string through', () => {
    expect(describeError('plain failure')).toBe('plain failure');
  });

  it('falls back for anything else', () => {
    expect(describeError({ weird: true })).toBe('Unknown error');
  });
});
