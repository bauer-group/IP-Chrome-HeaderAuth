import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
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
  const { granted, refresh } = useGrants(effective.rules);
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
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6 text-foreground">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/icons/48.png" alt="" className="h-8 w-8" />
          <div>
            <h1 className="text-xl font-semibold">{t('options.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('options.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle
            locale={config.uiLocale}
            onChange={(l: Locale) => void update({ ...config, uiLocale: l })}
          />
          <ImportExport config={config} onImport={(c: Config) => void update(c)} />
        </div>
      </header>

      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium">{t('options.master')}</p>
          <p className="text-xs text-muted-foreground">{t('options.masterHint')}</p>
        </div>
        <Switch
          checked={effective.masterEnabled}
          disabled={masterManaged}
          onCheckedChange={(v) => void update({ ...config, masterEnabled: v })}
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('options.rules')}</h2>
        <Button onClick={() => setDialog({ rule: createBlankRule(), isNew: true })}>
          <Plus className="h-4 w-4" />
          {t('options.addRule')}
        </Button>
      </div>

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
            onEdit={(rule) => setDialog({ rule, isNew: false })}
            onDelete={(rule) => void deleteRule(rule)}
            onToggle={toggleRule}
            onGrant={(rule) => void grantRule(rule)}
          />
        </div>
      )}

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
