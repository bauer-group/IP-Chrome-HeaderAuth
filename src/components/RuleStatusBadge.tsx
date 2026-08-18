import { AlertTriangle, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Badge } from './ui/badge';
import { useI18n } from '../lib/i18n';
import type { EffectiveRule } from '../lib/schema/config';
import { ruleStatus } from '../lib/rule-status';

export function RuleStatusBadge({
  rule,
  granted,
  applied = null,
}: {
  rule: EffectiveRule;
  granted: boolean;
  /** What the DNR engine reports. `null` = not reported yet; never rendered as failure. */
  applied?: boolean | null;
}) {
  const { t } = useI18n();
  const { key } = ruleStatus(rule, granted, applied);

  if (key === 'active') {
    return (
      <Badge variant="success">
        <ShieldCheck className="h-3 w-3" />
        {t('popup.statusActive')}
      </Badge>
    );
  }
  if (key === 'inactive') {
    return (
      <Badge variant="destructive" title={t('status.inactiveHint')}>
        <ShieldAlert className="h-3 w-3" />
        {t('popup.statusInactive')}
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
