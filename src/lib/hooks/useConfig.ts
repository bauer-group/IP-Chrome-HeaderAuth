import { useCallback, useEffect, useState } from 'react';
import { type Config, type EffectiveConfig, DEFAULT_CONFIG } from '../schema/config';
import { loadConfig, saveConfig, onConfigChanged } from '../storage';
import { loadManagedConfig, type ManagedConfig } from '../storage/managed';
import { computeEffectiveConfig } from '../effective';

export interface UseConfig {
  config: Config;
  managed: ManagedConfig | null;
  effective: EffectiveConfig;
  loading: boolean;
  update: (next: Config) => Promise<void>;
}

/** Load user + managed config, expose the merged effective view, and persist updates. */
export function useConfig(): UseConfig {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [managed, setManaged] = useState<ManagedConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [user, mgd] = await Promise.all([loadConfig(), loadManagedConfig()]);
    setConfig(user);
    setManaged(mgd);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
    return onConfigChanged(() => void reload());
  }, [reload]);

  const update = useCallback(async (next: Config) => {
    setConfig(next); // optimistic
    await saveConfig(next);
  }, []);

  const effective = computeEffectiveConfig(config, managed);
  return { config, managed, effective, loading, update };
}
