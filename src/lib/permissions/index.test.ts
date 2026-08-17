import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { browser } from 'wxt/browser';
import {
  hasOriginsForPatterns,
  requestOriginsForPatterns,
  removeOriginsForPatterns,
} from './index';
import { patternsToOrigins } from './patterns';

const DOMAIN = 'app.bauer-group.com';

describe('hasOriginsForPatterns', () => {
  beforeEach(() => fakeBrowser.reset());

  it('short-circuits to true when no pattern yields an origin', async () => {
    const contains = vi.spyOn(browser.permissions, 'contains');
    await expect(hasOriginsForPatterns([])).resolves.toBe(true);
    expect(contains).not.toHaveBeenCalled();
  });

  it('delegates to permissions.contains with the derived origins', async () => {
    const contains = vi.spyOn(browser.permissions, 'contains').mockResolvedValue(true as never);
    await expect(hasOriginsForPatterns([DOMAIN])).resolves.toBe(true);
    expect(contains).toHaveBeenCalledWith({ origins: patternsToOrigins([DOMAIN]) });
  });

  it('reports false when the grant is absent', async () => {
    vi.spyOn(browser.permissions, 'contains').mockResolvedValue(false as never);
    await expect(hasOriginsForPatterns([DOMAIN])).resolves.toBe(false);
  });

  it('reports false when the binding rejects', async () => {
    vi.spyOn(browser.permissions, 'contains').mockRejectedValue(new Error('nope') as never);
    await expect(hasOriginsForPatterns([DOMAIN])).resolves.toBe(false);
  });
});

describe('requestOriginsForPatterns', () => {
  beforeEach(() => fakeBrowser.reset());

  it('short-circuits to true when there is nothing to request', async () => {
    const request = vi.spyOn(browser.permissions, 'request');
    await expect(requestOriginsForPatterns([])).resolves.toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it('reports false when the user denies the prompt', async () => {
    vi.spyOn(browser.permissions, 'request').mockResolvedValue(false as never);
    await expect(requestOriginsForPatterns([DOMAIN])).resolves.toBe(false);
  });

  it('reports false when the binding rejects', async () => {
    vi.spyOn(browser.permissions, 'request').mockRejectedValue(new Error('nope') as never);
    await expect(requestOriginsForPatterns([DOMAIN])).resolves.toBe(false);
  });
});

describe('removeOriginsForPatterns', () => {
  beforeEach(() => fakeBrowser.reset());

  it('keeps origins that are still used by another rule', async () => {
    const remove = vi.spyOn(browser.permissions, 'remove').mockResolvedValue(true as never);
    await expect(removeOriginsForPatterns([DOMAIN], [DOMAIN])).resolves.toBe(true);
    expect(remove).not.toHaveBeenCalled();
  });

  it('revokes origins that no remaining rule needs', async () => {
    const remove = vi.spyOn(browser.permissions, 'remove').mockResolvedValue(true as never);
    await expect(removeOriginsForPatterns(['gone.example.com'], [])).resolves.toBe(true);
    expect(remove).toHaveBeenCalledWith({ origins: patternsToOrigins(['gone.example.com']) });
  });

  it('revokes only the origins that are actually free', async () => {
    const remove = vi.spyOn(browser.permissions, 'remove').mockResolvedValue(true as never);
    await removeOriginsForPatterns(['gone.example.com', DOMAIN], [DOMAIN]);
    expect(remove).toHaveBeenCalledWith({ origins: patternsToOrigins(['gone.example.com']) });
  });

  it('reports false when the binding rejects', async () => {
    vi.spyOn(browser.permissions, 'remove').mockRejectedValue(new Error('nope') as never);
    await expect(removeOriginsForPatterns(['gone.example.com'], [])).resolves.toBe(false);
  });
});
