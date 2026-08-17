import { z } from 'zod';

/** HTTP header name: letters, digits and hyphens only (RFC token subset we allow). */
export const HeaderNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9-]+$/, 'Header name may contain letters, digits and hyphens only');

/**
 * GUID shape (8-4-4-4-12 hex). Intentionally lenient vs. RFC UUID variant/version
 * checks: the secret is a shared token that may come from any GUID source (.NET,
 * backend, manual), and the all-zero null GUID is our "unset" sentinel.
 */
export const GUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Secret value — a GUID-shaped token. */
export const SecretSchema = z
  .string()
  .trim()
  .regex(GUID_REGEX, 'Secret must be a GUID, e.g. 1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d');

/** A bare domain (`app.example.com`) or wildcard subdomain (`*.example.com`). No scheme, no path. */
export const DomainPatternSchema = z
  .string()
  .trim()
  .min(1)
  .regex(
    /^(\*\.)?([a-z0-9-]+\.)+[a-z]{2,}$/i,
    'Enter a domain like app.example.com or *.example.com',
  );

export const RuleSchema = z.object({
  /** Internal stable id (not the numeric DNR rule id); generated via crypto.randomUUID(). */
  id: z.string().min(1),
  enabled: z.boolean().default(true),
  label: z.string().trim().min(1).max(60),
  domainPatterns: z.array(DomainPatternSchema).min(1),
  headerName: HeaderNameSchema.default('X-BAUERGROUP-Auth'),
  secretValue: SecretSchema,
  /** When false the secret is kept device-local instead of synced to the account cloud. */
  syncSecret: z.boolean().default(true),
});
export type Rule = z.infer<typeof RuleSchema>;

export const ConfigSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  masterEnabled: z.boolean().default(true),
  uiLocale: z.enum(['de', 'en']).default('de'),
  rules: z.array(RuleSchema).default([]),
});
export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: Config = {
  schemaVersion: 1,
  masterEnabled: true,
  uiLocale: 'de',
  rules: [],
};

/** Where an effective rule originates from — drives the read-only "managed" UI badge. */
export type RuleSource = 'managed' | 'user';
export type EffectiveRule = Rule & { source: RuleSource };
export interface EffectiveConfig {
  masterEnabled: boolean;
  rules: EffectiveRule[];
}

/** A blank rule for seeding the "add rule" form (not yet valid until filled in). */
export function createBlankRule(): Rule {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    label: '',
    domainPatterns: [],
    headerName: 'X-BAUERGROUP-Auth',
    secretValue: '',
    syncSecret: true,
  };
}

/** Parse unknown storage data into a Config, falling back to defaults on failure. */
export function parseConfig(data: unknown): Config {
  const result = ConfigSchema.safeParse(data ?? {});
  return result.success ? result.data : { ...DEFAULT_CONFIG };
}
