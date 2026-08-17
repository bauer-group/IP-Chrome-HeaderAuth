import { Plus, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { useI18n } from '../../lib/i18n';

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-12 text-center">
      <div className="rounded-full bg-muted p-3">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">{t('empty.title')}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{t('empty.body')}</p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4" />
        {t('empty.cta')}
      </Button>
    </div>
  );
}
