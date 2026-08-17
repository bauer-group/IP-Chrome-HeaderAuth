import { useState, type KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useI18n } from '../../lib/i18n';

export function DomainInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');

  const add = () => {
    const domain = draft.trim().toLowerCase();
    if (domain && !value.includes(domain)) onChange([...value, domain]);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={t('field.domainsPh')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="h-4 w-4" />
          {t('field.addDomain')}
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((domain) => (
            <Badge key={domain} variant="secondary">
              {domain}
              <button
                type="button"
                onClick={() => onChange(value.filter((d) => d !== domain))}
                className="ml-0.5 rounded-full hover:text-destructive"
                aria-label={`remove ${domain}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t('field.domainsHint')}</p>
    </div>
  );
}
