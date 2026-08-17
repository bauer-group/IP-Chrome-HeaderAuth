/**
 * Pure mapping helpers between user-facing domain patterns and the two shapes the
 * extension needs: DNR `requestDomains` entries and host permission match patterns.
 * Kept free of the `browser` global so they are trivially unit-testable.
 */

/** `*.example.com` / `app.example.com` → registrable host for DNR `requestDomains`. */
export function patternToRequestDomain(pattern: string): string {
  const host = pattern.trim().toLowerCase();
  return host.startsWith('*.') ? host.slice(2) : host;
}

/**
 * Domain pattern → host-permission match patterns (https + wss).
 * A leading `*.` host pattern matches the apex domain AND all subdomains, which
 * aligns with DNR `requestDomains` subdomain semantics.
 */
export function patternToOrigins(pattern: string): string[] {
  const trimmed = pattern.trim().toLowerCase();
  const host = trimmed.startsWith('*.') ? trimmed : `*.${trimmed}`;
  return [`https://${host}/*`, `wss://${host}/*`];
}

/** Flatten + de-duplicate the origins for a set of domain patterns. */
export function patternsToOrigins(patterns: string[]): string[] {
  return [...new Set(patterns.flatMap(patternToOrigins))];
}
