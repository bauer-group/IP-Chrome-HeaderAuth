import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { SecretField } from './SecretField';
import { DomainInput } from './DomainInput';
import { useI18n } from '../../lib/i18n';
import { RuleSchema, type Rule } from '../../lib/schema/config';

export function RuleDialog({
  initial,
  isNew,
  onClose,
  onSave,
}: {
  initial: Rule;
  isNew: boolean;
  onClose: () => void;
  onSave: (rule: Rule) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Rule>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Rule, string>>>({});

  const set = <K extends keyof Rule>(key: K, value: Rule[K]) =>
    setDraft((d) => ({ ...d, [key]: value }) as Rule);

  const submit = () => {
    const result = RuleSchema.safeParse(draft);
    if (!result.success) {
      const next: Partial<Record<keyof Rule, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof Rule | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    onSave(result.data);
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? t('dialog.addTitle') : t('dialog.editTitle')}</DialogTitle>
          <DialogDescription>{t('dialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label={t('field.label')} error={errors.label}>
            <Input
              value={draft.label}
              placeholder={t('field.labelPh')}
              onChange={(e) => set('label', e.target.value)}
            />
          </Field>

          <Field label={t('field.domains')} error={errors.domainPatterns}>
            <DomainInput value={draft.domainPatterns} onChange={(v) => set('domainPatterns', v)} />
          </Field>

          <Field label={t('field.header')} error={errors.headerName} hint={t('field.headerHint')}>
            <Input
              value={draft.headerName}
              onChange={(e) => set('headerName', e.target.value)}
              className="font-mono"
            />
          </Field>

          <Field label={t('field.secret')} error={errors.secretValue}>
            <SecretField value={draft.secretValue} onChange={(v) => set('secretValue', v)} />
          </Field>

          <label className="flex items-center justify-between gap-4">
            <span className="flex flex-col">
              <span className="text-sm font-medium">{t('field.syncSecret')}</span>
              <span className="text-xs text-muted-foreground">{t('field.syncSecretHint')}</span>
            </span>
            <Switch checked={draft.syncSecret} onCheckedChange={(v) => set('syncSecret', v)} />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('action.cancel')}
          </Button>
          <Button onClick={submit}>{t('action.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
