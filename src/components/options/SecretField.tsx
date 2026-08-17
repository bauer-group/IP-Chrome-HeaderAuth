import { useState } from 'react';
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useI18n } from '../../lib/i18n';
import { toast } from '../ui/sonner';

export function SecretField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  const [reveal, setReveal] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    toast.success(t('toast.copied'));
  };

  return (
    <div className="flex gap-2">
      <Input
        type={reveal ? 'text' : 'password'}
        value={value}
        placeholder={t('field.secretPh')}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        className="font-mono"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        title={reveal ? t('field.hide') : t('field.reveal')}
        onClick={() => setReveal((r) => !r)}
      >
        {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        title={t('field.generate')}
        onClick={() => onChange(crypto.randomUUID())}
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        title={t('field.copy')}
        onClick={() => void copy()}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}
