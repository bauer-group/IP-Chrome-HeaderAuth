import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { HEALTH_KEY, readHealth, type DnrHealth } from '../dnr/health';

/**
 * Track what the DNR engine last reported. Stays `null` until the background has run
 * at least once, so a freshly opened page shows no verdict rather than a wrong one.
 */
export function useDnrHealth(): DnrHealth | null {
  const [health, setHealth] = useState<DnrHealth | null>(null);

  useEffect(() => {
    let alive = true;
    void readHealth().then((value) => {
      if (alive) setHealth(value);
    });

    const listener = (changes: Record<string, unknown> | undefined, areaName: string) => {
      if (areaName !== 'local' || !changes || !(HEALTH_KEY in changes)) return;
      void readHealth().then((value) => {
        if (alive) setHealth(value);
      });
    };
    browser.storage.onChanged.addListener(listener);
    return () => {
      alive = false;
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  return health;
}
