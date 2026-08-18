import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { EffectiveRule } from '../schema/config';
import { patternsToOrigins, patternsToWebSocketOrigins } from '../permissions';

export interface Grants {
  /** Rules whose required (https) host access is granted — this drives rule status. */
  granted: Set<string>;
  /** Rules that additionally hold the optional wss access, so websockets carry the header. */
  wssGranted: Set<string>;
  refresh: () => void;
}

/** Track which rules currently have their host permission granted; refresh on permission changes. */
export function useGrants(rules: EffectiveRule[]): Grants {
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [wssGranted, setWssGranted] = useState<Set<string>>(new Set());
  const signature = rules.map((r) => `${r.id}:${r.domainPatterns.join(',')}`).join('|');

  const refresh = useCallback(async () => {
    const contains = (origins: string[]) =>
      origins.length === 0
        ? Promise.resolve(true)
        : browser.permissions.contains({ origins }).catch(() => false);

    const entries = await Promise.all(
      rules.map(async (rule) => {
        const [https, wss] = await Promise.all([
          contains(patternsToOrigins(rule.domainPatterns)),
          contains(patternsToWebSocketOrigins(rule.domainPatterns)),
        ]);
        return [rule.id, https, wss] as const;
      }),
    );
    setGranted(new Set(entries.filter(([, https]) => https).map(([id]) => id)));
    setWssGranted(new Set(entries.filter(([, , wss]) => wss).map(([id]) => id)));
    // rules referenced via stable `signature`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    browser.permissions.onAdded.addListener(onChange);
    browser.permissions.onRemoved.addListener(onChange);
    return () => {
      browser.permissions.onAdded.removeListener(onChange);
      browser.permissions.onRemoved.removeListener(onChange);
    };
  }, [refresh]);

  return { granted, wssGranted, refresh };
}
