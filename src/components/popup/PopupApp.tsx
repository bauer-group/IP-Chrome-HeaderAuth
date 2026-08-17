import { browser } from 'wxt/browser';
import { ExternalLink, Building2 } from 'lucide-react';
import { I18nProvider, useI18n } from '../../lib/i18n';
import { TooltipProvider } from '../ui/tooltip';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { RuleStatusBadge } from '../RuleStatusBadge';
import { useConfig, type UseConfig } from '../../lib/hooks/useConfig';
import { useGrants } from '../../lib/hooks/useGrants';
import { requestOriginsForPatterns } from '../../lib/permissions';
import type { EffectiveRule } from '../../lib/schema/config';

export function PopupApp() {
  const cfg = useConfig();
  return (
    <I18nProvider locale={cfg.config.uiLocale}>
      <TooltipProvider delayDuration={200}>
        <PopupContent cfg={cfg} />
      </TooltipProvider>
    </I18nProvider>
  );
}

function PopupContent({ cfg }: { cfg: UseConfig }) {
  const { t } = useI18n();
  const { effective, config, managed, update } = cfg;
  const { granted, refresh } = useGrants(effective.rules);

  const activeCount = effective.rules.filter((r) => r.enabled && granted.has(r.id)).length;
  const masterManaged = managed?.masterEnabled !== undefined;

  return (
    <div className="flex w-96 flex-col gap-3 bg-background p-4 text-foreground">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/icons/32.png" alt="" className="h-5 w-5" />
          <span className="text-sm font-semibold">{t('app.name')}</span>
        </div>
        <Badge variant={activeCount > 0 ? 'success' : 'secondary'}>
          {t('popup.activeCount', { count: activeCount })}
        </Badge>
      </header>

      <div className="flex items-center justify-between rounded-md border border-border bg-card p-3">
        <span className="text-sm font-medium">{t('popup.master')}</span>
        <Switch
          checked={effective.masterEnabled}
          disabled={masterManaged}
          onCheckedChange={(v) => void update({ ...config, masterEnabled: v })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('popup.protectedDomains')}
        </span>
        {effective.rules.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{t('popup.noRules')}</p>
        ) : (
          effective.rules.map((rule) => (
            <PopupRow
              key={rule.id}
              rule={rule}
              granted={granted.has(rule.id)}
              onGranted={refresh}
            />
          ))
        )}
      </div>

      <Button variant="outline" size="sm" onClick={() => void browser.runtime.openOptionsPage()}>
        <ExternalLink className="h-4 w-4" />
        {t('popup.openSettings')}
      </Button>
    </div>
  );
}

function PopupRow({
  rule,
  granted,
  onGranted,
}: {
  rule: EffectiveRule;
  granted: boolean;
  onGranted: () => void;
}) {
  const { t } = useI18n();
  const needsAccess = rule.enabled && !granted;

  const grant = async () => {
    const ok = await requestOriginsForPatterns(rule.domainPatterns);
    if (ok) onGranted();
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{rule.label}</span>
          {rule.source === 'managed' && (
            <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
        </div>
        <span className="block truncate text-xs text-muted-foreground">
          {rule.domainPatterns.join(', ')}
        </span>
      </div>
      {needsAccess ? (
        <Button variant="secondary" size="sm" onClick={() => void grant()}>
          {t('popup.grant')}
        </Button>
      ) : (
        <RuleStatusBadge rule={rule} granted={granted} />
      )}
    </div>
  );
}
