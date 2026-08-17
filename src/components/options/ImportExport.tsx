import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { useI18n } from '../../lib/i18n';
import { toast } from '../ui/sonner';
import { ConfigSchema, type Config } from '../../lib/schema/config';

export function ImportExport({
  config,
  onImport,
}: {
  config: Config;
  onImport: (config: Config) => void;
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'header-authenticator-config.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('toast.exported'));
  };

  const importConfig = async (file: File) => {
    try {
      const parsed = ConfigSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) throw new Error('invalid');
      onImport(parsed.data);
      toast.success(t('toast.imported'));
    } catch {
      toast.error(t('toast.importError'));
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={exportConfig}>
        <Download className="h-4 w-4" />
        {t('io.export')}
      </Button>
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
        <Upload className="h-4 w-4" />
        {t('io.import')}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importConfig(file);
          e.target.value = '';
        }}
      />
    </>
  );
}
