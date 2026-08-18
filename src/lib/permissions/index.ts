import { browser } from 'wxt/browser';
import { patternsToOrigins, patternsToWebSocketOrigins } from './patterns';

export {
  patternToOrigins,
  patternToRequestDomain,
  patternToWebSocketOrigins,
  patternsToOrigins,
  patternsToWebSocketOrigins,
} from './patterns';

/** Are all host permissions required for these domain patterns currently granted? */
export async function hasOriginsForPatterns(patterns: string[]): Promise<boolean> {
  const origins = patternsToOrigins(patterns);
  if (origins.length === 0) return true;
  try {
    return await browser.permissions.contains({ origins });
  } catch {
    return false;
  }
}

/**
 * Is the optional `wss://` access for these patterns granted too? Only affects whether
 * WebSocket upgrades carry the header — never whether the rule counts as active.
 */
export async function hasWebSocketOriginsForPatterns(patterns: string[]): Promise<boolean> {
  const origins = patternsToWebSocketOrigins(patterns);
  if (origins.length === 0) return true;
  try {
    return await browser.permissions.contains({ origins });
  } catch {
    return false;
  }
}

/**
 * Request host permissions for these domain patterns (must be called from a user
 * gesture). Asks for https + wss in ONE prompt so a single click covers both.
 *
 * A rejected promise means the browser refused the pattern set outright — practically
 * only the undocumented `wss` scheme can do that — so we retry with the required https
 * origins alone rather than leaving the user with nothing. A resolved `false` is the
 * user declining; that is an answer, not a failure, and must not re-prompt.
 */
export async function requestOriginsForPatterns(patterns: string[]): Promise<boolean> {
  const required = patternsToOrigins(patterns);
  if (required.length === 0) return true;
  try {
    return await browser.permissions.request({
      origins: [...required, ...patternsToWebSocketOrigins(patterns)],
    });
  } catch {
    try {
      return await browser.permissions.request({ origins: required });
    } catch {
      return false;
    }
  }
}

/** Revoke host permissions for these domain patterns (skips origins still in use elsewhere). */
export async function removeOriginsForPatterns(
  patterns: string[],
  stillUsedPatterns: string[] = [],
): Promise<boolean> {
  const keep = new Set([
    ...patternsToOrigins(stillUsedPatterns),
    ...patternsToWebSocketOrigins(stillUsedPatterns),
  ]);
  const origins = [...patternsToOrigins(patterns), ...patternsToWebSocketOrigins(patterns)].filter(
    (o) => !keep.has(o),
  );
  if (origins.length === 0) return true;
  try {
    return await browser.permissions.remove({ origins });
  } catch {
    return false;
  }
}
