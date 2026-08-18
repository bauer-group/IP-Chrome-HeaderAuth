import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { browser } from 'wxt/browser';
import {
  hasOriginsForPatterns,
  hasWebSocketOriginsForPatterns,
  requestOriginsForPatterns,
  removeOriginsForPatterns,
} from './index';
import { patternsToOrigins, patternsToWebSocketOrigins } from './patterns';

const DOMAIN = 'app.bauer-group.com';

describe('hasOriginsForPatterns', () => {
  beforeEach(() => fakeBrowser.reset());

  it('short-circuits to true when no pattern yields an origin', async () => {
    const contains = vi.spyOn(browser.permissions, 'contains');
    await expect(hasOriginsForPatterns([])).resolves.toBe(true);
    expect(contains).not.toHaveBeenCalled();
  });

  it('checks only the required https origin, never the optional wss one', async () => {
    const contains = vi.spyOn(browser.permissions, 'contains').mockResolvedValue(true as never);
    await expect(hasOriginsForPatterns([DOMAIN])).resolves.toBe(true);
    expect(contains).toHaveBeenCalledWith({ origins: patternsToOrigins([DOMAIN]) });
    expect(contains).not.toHaveBeenCalledWith(
      expect.objectContaining({
        origins: expect.arrayContaining(patternsToWebSocketOrigins([DOMAIN])),
      }),
    );
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

describe('hasWebSocketOriginsForPatterns', () => {
  beforeEach(() => fakeBrowser.reset());

  it('short-circuits to true when there is nothing to check', async () => {
    const contains = vi.spyOn(browser.permissions, 'contains');
    await expect(hasWebSocketOriginsForPatterns([])).resolves.toBe(true);
    expect(contains).not.toHaveBeenCalled();
  });

  it('checks the wss origins', async () => {
    const contains = vi.spyOn(browser.permissions, 'contains').mockResolvedValue(true as never);
    await expect(hasWebSocketOriginsForPatterns([DOMAIN])).resolves.toBe(true);
    expect(contains).toHaveBeenCalledWith({ origins: patternsToWebSocketOrigins([DOMAIN]) });
  });

  it('reports false when the browser rejects the undocumented scheme', async () => {
    vi.spyOn(browser.permissions, 'contains').mockRejectedValue(new Error('bad scheme') as never);
    await expect(hasWebSocketOriginsForPatterns([DOMAIN])).resolves.toBe(false);
  });
});

describe('requestOriginsForPatterns', () => {
  beforeEach(() => fakeBrowser.reset());

  it('short-circuits to true when there is nothing to request', async () => {
    const request = vi.spyOn(browser.permissions, 'request');
    await expect(requestOriginsForPatterns([])).resolves.toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it('asks for https and wss together, so one click covers both', async () => {
    const request = vi.spyOn(browser.permissions, 'request').mockResolvedValue(true as never);
    await expect(requestOriginsForPatterns([DOMAIN])).resolves.toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith({
      origins: [...patternsToOrigins([DOMAIN]), ...patternsToWebSocketOrigins([DOMAIN])],
    });
  });

  it('retries with https alone when the browser refuses the wss scheme', async () => {
    const request = vi
      .spyOn(browser.permissions, 'request')
      .mockRejectedValueOnce(new Error('Invalid value for origin pattern') as never)
      .mockResolvedValueOnce(true as never);
    await expect(requestOriginsForPatterns([DOMAIN])).resolves.toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith({ origins: patternsToOrigins([DOMAIN]) });
  });

  it('does not re-prompt when the user declines', async () => {
    const request = vi.spyOn(browser.permissions, 'request').mockResolvedValue(false as never);
    await expect(requestOriginsForPatterns([DOMAIN])).resolves.toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('reports false when both attempts reject', async () => {
    vi.spyOn(browser.permissions, 'request').mockRejectedValue(new Error('nope') as never);
    await expect(requestOriginsForPatterns([DOMAIN])).resolves.toBe(false);
  });
});

describe('removeOriginsForPatterns', () => {
  beforeEach(() => fakeBrowser.reset());

  const allOrigins = (patterns: string[]) => [
    ...patternsToOrigins(patterns),
    ...patternsToWebSocketOrigins(patterns),
  ];

  it('keeps origins that are still used by another rule', async () => {
    const remove = vi.spyOn(browser.permissions, 'remove').mockResolvedValue(true as never);
    await expect(removeOriginsForPatterns([DOMAIN], [DOMAIN])).resolves.toBe(true);
    expect(remove).not.toHaveBeenCalled();
  });

  it('revokes both schemes for origins that no remaining rule needs', async () => {
    const remove = vi.spyOn(browser.permissions, 'remove').mockResolvedValue(true as never);
    await expect(removeOriginsForPatterns(['gone.example.com'], [])).resolves.toBe(true);
    expect(remove).toHaveBeenCalledWith({ origins: allOrigins(['gone.example.com']) });
  });

  it('revokes only the origins that are actually free', async () => {
    const remove = vi.spyOn(browser.permissions, 'remove').mockResolvedValue(true as never);
    await removeOriginsForPatterns(['gone.example.com', DOMAIN], [DOMAIN]);
    expect(remove).toHaveBeenCalledWith({ origins: allOrigins(['gone.example.com']) });
  });

  it('reports false when the binding rejects', async () => {
    vi.spyOn(browser.permissions, 'remove').mockRejectedValue(new Error('nope') as never);
    await expect(removeOriginsForPatterns(['gone.example.com'], [])).resolves.toBe(false);
  });
});
