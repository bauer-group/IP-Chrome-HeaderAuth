import type { Config } from '../schema/config';

/**
 * chrome.storage.sync enforces ~8 KB per item. We store the whole config under a
 * single `config` item by default (atomic writes), and transparently shard into
 * one item per rule only when the serialized size approaches the limit.
 */
export const SYNC_ITEM_SAFE_BYTES = 7000;
export const CONFIG_KEY = 'config';
export const RULE_PREFIX = 'rule:';

export interface PlannedWrite {
  /** Items to write via storage.sync.set. */
  set: Record<string, unknown>;
  /** Stale keys to remove via storage.sync.remove. */
  removeKeys: string[];
}

function byteLength(value: unknown): number {
  return JSON.stringify(value).length;
}

/** Decide how to persist a config across sync items, given the currently stored keys. */
export function planWrite(config: Config, existingKeys: string[]): PlannedWrite {
  const whole = { ...config, _sharded: false as const };

  if (byteLength(whole) <= SYNC_ITEM_SAFE_BYTES) {
    // Single item — drop any leftover shards from a previous large config.
    const removeKeys = existingKeys.filter((k) => k.startsWith(RULE_PREFIX));
    return { set: { [CONFIG_KEY]: whole }, removeKeys };
  }

  // Sharded — meta item holds everything except the rule bodies.
  const meta = {
    schemaVersion: config.schemaVersion,
    masterEnabled: config.masterEnabled,
    uiLocale: config.uiLocale,
    _sharded: true as const,
    ruleIds: config.rules.map((r) => r.id),
  };
  const set: Record<string, unknown> = { [CONFIG_KEY]: meta };
  for (const rule of config.rules) set[RULE_PREFIX + rule.id] = rule;

  const keep = new Set(config.rules.map((r) => RULE_PREFIX + r.id));
  const removeKeys = existingKeys.filter((k) => k.startsWith(RULE_PREFIX) && !keep.has(k));
  return { set, removeKeys };
}

/** Reassemble a raw sync-storage snapshot back into a config-shaped object. */
export function readConfig(raw: Record<string, unknown>): unknown {
  const meta = raw[CONFIG_KEY] as Record<string, unknown> | undefined;
  if (!meta) return undefined;

  if (meta['_sharded'] === true) {
    const ruleIds = (meta['ruleIds'] as string[]) ?? [];
    const rules = ruleIds.map((id) => raw[RULE_PREFIX + id]).filter((r) => r != null);
    return {
      schemaVersion: meta['schemaVersion'],
      masterEnabled: meta['masterEnabled'],
      uiLocale: meta['uiLocale'],
      rules,
    };
  }

  const { _sharded, ...config } = meta;
  void _sharded;
  return config;
}
