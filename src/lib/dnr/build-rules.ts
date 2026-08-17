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

/** Resource types the auth header should be attached to (incl. websocket — best-effort). */
export const DNR_RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'xmlhttprequest',
  'websocket',
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
