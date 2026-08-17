import { Globe } from 'lucide-react';
import { Button } from '../ui/button';
import type { Locale } from '../../lib/i18n';

const LOCALES: Locale[] = ['de', 'en'];

export function LanguageToggle({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Globe className="h-4 w-4 text-muted-foreground" />
      {LOCALES.map((l) => (
        <Button
          key={l}
          variant={locale === l ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onChange(l)}
        >
          {l.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
