import { useState } from 'react';
import { AlertOctagon, Building2, Plus } from 'lucide-react';
import { I18nProvider, useI18n, type Locale } from '../../lib/i18n';
import { TooltipProvider } from '../ui/tooltip';
import { Toaster, toast } from '../ui/sonner';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { EmptyState } from './EmptyState';
import { RulesTable } from './RulesTable';
import { RuleDialog } from './RuleDialog';
import { LanguageToggle } from './LanguageToggle';
import { ImportExport } from './ImportExport';
import { useConfig, type UseConfig } from '../../lib/hooks/useConfig';
import { useGrants } from '../../lib/hooks/useGrants';
import { useDnrHealth } from '../../lib/hooks/useDnrHealth';
import { isRuleApplied } from '../../lib/dnr/health';
import {
  createBlankRule,
  type Config,
  type EffectiveRule,
  type Rule,
} from '../../lib/schema/config';
import { removeOriginsForPatterns, requestOriginsForPatterns } from '../../lib/permissions';

export function OptionsApp() {
  const cfg = useConfig();
  return (
    <I18nProvider locale={cfg.config.uiLocale}>
      <TooltipProvider delayDuration={200}>
        <OptionsContent cfg={cfg} />
        <Toaster />
      </TooltipProvider>
    </I18nProvider>
  );
}

interface DialogState {
  rule: Rule;
  isNew: boolean;
}

function OptionsContent({ cfg }: { cfg: UseConfig }) {
  const { t } = useI18n();
  const { config, managed, effective, update } = cfg;
  const { granted, wssGranted, refresh } = useGrants(effective.rules);
  const health = useDnrHealth();
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const masterManaged = managed?.masterEnabled !== undefined;
  const hasManaged = effective.rules.some((r) => r.source === 'managed');
  const isEmpty = effective.rules.length === 0;

  const saveRule = async (rule: Rule) => {
    setDialog(null);
    // Request host access first so the user gesture from the Save click is preserved.
    const ok = await requestOriginsForPatterns(rule.domainPatterns);
    const exists = config.rules.some((r) => r.id === rule.id);
    const rules = exists
      ? config.rules.map((r) => (r.id === rule.id ? rule : r))
      : [...config.rules, rule];
    await update({ ...config, rules });
    refresh();
    toast.success(ok ? t('toast.saved') : t('toast.permDenied'));
  };

  const deleteRule = async (rule: EffectiveRule) => {
    const rules = config.rules.filter((r) => r.id !== rule.id);
    const stillUsed = rules.flatMap((r) => r.domainPatterns);
    await removeOriginsForPatterns(rule.domainPatterns, stillUsed);
    await update({ ...config, rules });
    refresh();
    toast.success(t('toast.deleted'));
  };

  const toggleRule = (rule: EffectiveRule, enabled: boolean) => {
    void update({
      ...config,
      rules: config.rules.map((r) => (r.id === rule.id ? { ...r, enabled } : r)),
    });
  };

  const grantRule = async (rule: EffectiveRule) => {
    const ok = await requestOriginsForPatterns(rule.domainPatterns);
    refresh();
    if (ok) toast.success(t('toast.permGranted'));
    else toast.error(t('toast.permDenied'));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/icons/48.png" alt="" className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold sm:text-xl">{t('options.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('options.subtitle')}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle
              locale={config.uiLocale}
              onChange={(l: Locale) => void update({ ...config, uiLocale: l })}
            />
            <ImportExport config={config} onImport={(c: Config) => void update(c)} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 sm:px-8">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-5">
          <div className="min-w-0">
            <p className="text-sm font-medium">{t('options.master')}</p>
            <p className="text-xs text-muted-foreground">{t('options.masterHint')}</p>
          </div>
          <Switch
            checked={effective.masterEnabled}
            disabled={masterManaged}
            onCheckedChange={(v) => void update({ ...config, masterEnabled: v })}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t('options.rules')}</h2>
          <Button onClick={() => setDialog({ rule: createBlankRule(), isNew: true })}>
            <Plus className="h-4 w-4" />
            {t('options.addRule')}
          </Button>
        </div>

        {health?.error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0">
              <p className="font-medium text-destructive">{t('health.failedTitle')}</p>
              <p className="mt-0.5 break-words text-muted-foreground">
                {t('health.failedBody', { error: health.error })}
              </p>
            </div>
          </div>
        )}

        {hasManaged && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            <Building2 className="h-4 w-4 shrink-0" />
            {t('managed.hint')}
          </div>
        )}

        {isEmpty ? (
          <EmptyState onAdd={() => setDialog({ rule: createBlankRule(), isNew: true })} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <RulesTable
              effective={effective}
              granted={granted}
              wssGranted={wssGranted}
              appliedFor={(ruleId) => isRuleApplied(health, ruleId)}
              onEdit={(rule) => setDialog({ rule, isNew: false })}
              onDelete={(rule) => void deleteRule(rule)}
              onToggle={toggleRule}
              onGrant={(rule) => void grantRule(rule)}
            />
          </div>
        )}
      </main>

      {dialog && (
        <RuleDialog
          initial={dialog.rule}
          isNew={dialog.isNew}
          onClose={() => setDialog(null)}
          onSave={(rule) => void saveRule(rule)}
        />
      )}
    </div>
  );
}
