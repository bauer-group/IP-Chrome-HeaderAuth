import { browser } from 'wxt/browser';
import { z } from 'zod';
import {
  DomainPatternSchema,
  HeaderNameSchema,
  SecretSchema,
  type EffectiveRule,
} from '../schema/config';

/**
 * Shape of a single rule provisioned by enterprise policy (GPO/MDM) via
 * chrome.storage.managed. Admins don't set internal ids, so they are omitted here
 * and synthesised on read.
 */
export const ManagedRuleSchema = z.object({
  label: z.string().trim().min(1).max(60),
  domainPatterns: z.array(DomainPatternSchema).min(1),
  headerName: HeaderNameSchema.default('X-BAUERGROUP-Auth'),
  secretValue: SecretSchema,
  enabled: z.boolean().default(true),
});

export const ManagedConfigSchema = z.object({
  masterEnabled: z.boolean().optional(),
  rules: z.array(ManagedRuleSchema).default([]),
});
export type ManagedConfig = z.infer<typeof ManagedConfigSchema>;

/** Read the (read-only) managed policy. Returns null when no/invalid policy is present. */
export async function loadManagedConfig(): Promise<ManagedConfig | null> {
  try {
    const raw = (await browser.storage.managed.get(null)) as Record<string, unknown>;
    if (!raw || Object.keys(raw).length === 0) return null;
    const parsed = ManagedConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    // Managed storage is unavailable on unmanaged devices — not an error.
    return null;
  }
}

/** Map managed rules to effective rules tagged as read-only/managed for the UI + engine. */
export function managedRulesToEffective(managed: ManagedConfig): EffectiveRule[] {
  return managed.rules.map((rule, index) => ({
    id: `managed-${index}`,
    enabled: rule.enabled,
    label: rule.label,
    domainPatterns: rule.domainPatterns,
    headerName: rule.headerName,
    secretValue: rule.secretValue,
    syncSecret: true,
    source: 'managed',
  }));
}
