import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { EffectiveRule } from '../schema/config';
import { patternsToOrigins } from '../permissions';

/** Track which rules currently have their host permission granted; refresh on permission changes. */
export function useGrants(rules: EffectiveRule[]): { granted: Set<string>; refresh: () => void } {
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const signature = rules.map((r) => `${r.id}:${r.domainPatterns.join(',')}`).join('|');

  const refresh = useCallback(async () => {
    const entries = await Promise.all(
      rules.map(async (rule) => {
        const ok = await browser.permissions
          .contains({ origins: patternsToOrigins(rule.domainPatterns) })
          .catch(() => false);
        return [rule.id, ok] as const;
      }),
    );
    setGranted(new Set(entries.filter(([, ok]) => ok).map(([id]) => id)));
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

  return { granted, refresh };
}
