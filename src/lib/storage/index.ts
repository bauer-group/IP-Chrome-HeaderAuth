import { browser } from 'wxt/browser';
import { type Config, parseConfig } from '../schema/config';
import { HEALTH_KEY } from '../dnr/health';
import { planWrite, readConfig } from './shard';

const LOCAL_SECRET_PREFIX = 'secret:';
const ZERO_GUID = '00000000-0000-0000-0000-000000000000';

/** Load and validate the user config from sync storage, hydrating device-local secrets. */
export async function loadConfig(): Promise<Config> {
  const syncRaw = (await browser.storage.sync.get(null)) as Record<string, unknown>;
  const config = parseConfig(readConfig(syncRaw));

  const localRaw = (await browser.storage.local.get(null)) as Record<string, unknown>;
  for (const rule of config.rules) {
    if (!rule.syncSecret) {
      const local = localRaw[LOCAL_SECRET_PREFIX + rule.id];
      rule.secretValue = typeof local === 'string' && local ? local : ZERO_GUID;
    }
  }
  return config;
}

/** Persist the user config: synced rules to sync storage, device-local secrets to local. */
export async function saveConfig(config: Config): Promise<void> {
  const localSet: Record<string, unknown> = {};
  const localRemove: string[] = [];

  const syncedConfig: Config = {
    ...config,
    rules: config.rules.map((rule) => {
      if (rule.syncSecret) {
        localRemove.push(LOCAL_SECRET_PREFIX + rule.id);
        return rule;
      }
      // Keep the secret out of the synced copy; store it device-locally instead.
      localSet[LOCAL_SECRET_PREFIX + rule.id] = rule.secretValue;
      return { ...rule, secretValue: ZERO_GUID };
    }),
  };

  const existingKeys = Object.keys(
    (await browser.storage.sync.get(null)) as Record<string, unknown>,
  );
  const { set, removeKeys } = planWrite(syncedConfig, existingKeys);

  if (removeKeys.length) await browser.storage.sync.remove(removeKeys);
  await browser.storage.sync.set(set);
  if (Object.keys(localSet).length) await browser.storage.local.set(localSet);
  if (localRemove.length) await browser.storage.local.remove(localRemove);
}

/**
 * Subscribe to any change in user (sync/local) or managed (policy) storage.
 *
 * Changes that touch ONLY the DNR health record are ignored: that record is written by
 * the rule refresh this callback triggers, so reacting to it would spin the service
 * worker in a write → notify → write loop forever.
 */
export function onConfigChanged(callback: () => void): () => void {
  const listener = (changes: Record<string, unknown> | undefined, areaName: string) => {
    if (areaName !== 'sync' && areaName !== 'local' && areaName !== 'managed') return;
    const keys = Object.keys(changes ?? {});
    if (keys.length > 0 && keys.every((key) => key === HEALTH_KEY)) return;
    callback();
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
