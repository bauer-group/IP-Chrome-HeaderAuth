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
 * Domain pattern → the host half of a match pattern. A leading `*.` matches the apex
 * domain AND all subdomains, which aligns with DNR `requestDomains` semantics.
 */
function patternToHost(pattern: string): string {
  const trimmed = pattern.trim().toLowerCase();
  return trimmed.startsWith('*.') ? trimmed : `*.${trimmed}`;
}

/**
 * The origins a rule NEEDS to function — `https://` only.
 *
 * Chrome documents exactly four match-pattern schemes (`http`, `https`, `file`, `*`),
 * so this is the only set a grant check or a UI status may safely depend on. Anything
 * built on top of a scheme Chrome may reject would report every rule as ungranted the
 * day that rejection starts.
 */
export function patternToOrigins(pattern: string): string[] {
  return [`https://${patternToHost(pattern)}/*`];
}

/**
 * The extra `wss://` origins that carry the header onto WebSocket upgrades.
 *
 * A `https://` host permission does NOT cover a `wss://` request, so websocket header
 * modification genuinely needs this — but `wss` is not a documented host-permission
 * scheme: Chrome accepts it at runtime while the Web Store rejects it in
 * `host_permissions`. It therefore lives in `optional_host_permissions` and is asked
 * for at runtime, and its absence downgrades websocket coverage instead of disabling
 * the rule.
 */
export function patternToWebSocketOrigins(pattern: string): string[] {
  return [`wss://${patternToHost(pattern)}/*`];
}

/** Flatten + de-duplicate the required (https) origins for a set of domain patterns. */
export function patternsToOrigins(patterns: string[]): string[] {
  return [...new Set(patterns.flatMap(patternToOrigins))];
}

/** Flatten + de-duplicate the optional (wss) origins for a set of domain patterns. */
export function patternsToWebSocketOrigins(patterns: string[]): string[] {
  return [...new Set(patterns.flatMap(patternToWebSocketOrigins))];
}
