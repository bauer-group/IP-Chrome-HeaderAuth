import { AlertTriangle, Shield, ShieldCheck } from 'lucide-react';
import { Badge } from './ui/badge';
import { useI18n } from '../lib/i18n';
import type { EffectiveRule } from '../lib/schema/config';
import { ruleStatus } from '../lib/rule-status';

export function RuleStatusBadge({ rule, granted }: { rule: EffectiveRule; granted: boolean }) {
  const { t } = useI18n();
  const { key } = ruleStatus(rule, granted);

  if (key === 'active') {
    return (
      <Badge variant="success">
        <ShieldCheck className="h-3 w-3" />
        {t('popup.statusActive')}
      </Badge>
    );
  }
  if (key === 'needs-access') {
    return (
      <Badge variant="warning">
        <AlertTriangle className="h-3 w-3" />
        {t('popup.statusNeedsAccess')}
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <Shield className="h-3 w-3" />
      {t('popup.statusDisabled')}
    </Badge>
  );
}
