/**
 * Self-contained declarativeNetRequest rule shape. We model the runtime JSON Chrome
 * actually expects (string-literal actions/operations) rather than coupling to a
 * specific @types flavour; the single cast to the API parameter type lives in
 * apply-rules.ts.
 */
export interface ModifyHeaderRule {
  id: number;
  priority: number;
  action: {
    type: 'modifyHeaders';
    requestHeaders: Array<{ header: string; operation: 'set'; value: string }>;
  };
  condition: {
    requestDomains: string[];
    resourceTypes: string[];
  };
}

/**
 * Chrome's complete `declarativeNetRequest.ResourceType` enum — the auth header goes
 * on EVERY request to a matched domain, mirroring v1's `Object.values(ResourceType)`.
 *
 * Listing a subset is not a safe optimisation: a reverse proxy that enforces the header
 * rejects whatever it does not see, so an SPA whose document loads but whose `script` /
 * `stylesheet` / `font` requests arrive bare simply never boots. `resourceTypes` must be
 * explicit because Chrome's default (property omitted) excludes `main_frame`.
 *
 * Scope is bounded by `condition.requestDomains`, so the secret still only ever leaves
 * the browser towards the rule's own domains.
 */
export const DNR_RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other',
] as const;

export interface RuleInput {
  ruleId: number;
  headerName: string;
  secretValue: string;
  /** Bare registrable domains for `condition.requestDomains` (scheme-agnostic, matches subdomains). */
  domains: string[];
}

export function buildRule(input: RuleInput): ModifyHeaderRule {
  return {
    id: input.ruleId,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [{ header: input.headerName, operation: 'set', value: input.secretValue }],
    },
    condition: {
      requestDomains: input.domains,
      resourceTypes: [...DNR_RESOURCE_TYPES],
    },
  };
}
