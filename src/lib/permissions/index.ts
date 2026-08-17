import { browser } from 'wxt/browser';
import { patternsToOrigins } from './patterns';

export { patternToOrigins, patternToRequestDomain, patternsToOrigins } from './patterns';

/** Are all host permissions for these domain patterns currently granted? */
export async function hasOriginsForPatterns(patterns: string[]): Promise<boolean> {
  const origins = patternsToOrigins(patterns);
  if (origins.length === 0) return true;
  try {
    return await browser.permissions.contains({ origins });
  } catch {
    return false;
  }
}

/** Request host permissions for these domain patterns (must be called from a user gesture). */
export async function requestOriginsForPatterns(patterns: string[]): Promise<boolean> {
  const origins = patternsToOrigins(patterns);
  if (origins.length === 0) return true;
  try {
    return await browser.permissions.request({ origins });
  } catch {
    return false;
  }
}

/** Revoke host permissions for these domain patterns (skips origins still in use elsewhere). */
export async function removeOriginsForPatterns(
  patterns: string[],
  stillUsedPatterns: string[] = [],
): Promise<boolean> {
  const keep = new Set(patternsToOrigins(stillUsedPatterns));
  const origins = patternsToOrigins(patterns).filter((o) => !keep.has(o));
  if (origins.length === 0) return true;
  try {
    return await browser.permissions.remove({ origins });
  } catch {
    return false;
  }
}
