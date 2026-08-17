import { Building2, Pencil, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { RuleStatusBadge } from '../RuleStatusBadge';
import { useI18n } from '../../lib/i18n';
import type { EffectiveConfig, EffectiveRule } from '../../lib/schema/config';

export function RulesTable({
  effective,
  granted,
  onEdit,
  onDelete,
  onToggle,
  onGrant,
}: {
  effective: EffectiveConfig;
  granted: Set<string>;
  onEdit: (rule: EffectiveRule) => void;
  onDelete: (rule: EffectiveRule) => void;
  onToggle: (rule: EffectiveRule, enabled: boolean) => void;
  onGrant: (rule: EffectiveRule) => void;
}) {
  const { t } = useI18n();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('col.status')}</TableHead>
          <TableHead>{t('col.label')}</TableHead>
          <TableHead>{t('col.domains')}</TableHead>
          <TableHead>{t('col.header')}</TableHead>
          <TableHead>{t('col.secret')}</TableHead>
          <TableHead className="text-right">{t('col.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {effective.rules.map((rule) => {
          const isManaged = rule.source === 'managed';
          const isGranted = granted.has(rule.id);
          return (
            <TableRow key={rule.id}>
              <TableCell>
                {rule.enabled && !isGranted ? (
                  <Button variant="secondary" size="sm" onClick={() => onGrant(rule)}>
                    {t('popup.grant')}
                  </Button>
                ) : (
                  <RuleStatusBadge rule={rule} granted={isGranted} />
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{rule.label}</span>
                  {isManaged && (
                    <Badge variant="secondary" title={t('managed.hint')}>
                      <Building2 className="h-3 w-3" />
                      {t('managed.badge')}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="max-w-[16rem]">
                <span className="text-xs text-muted-foreground">
                  {rule.domainPatterns.join(', ')}
                </span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs">{rule.headerName}</span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-muted-foreground">
                  {maskSecret(rule.secretValue)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {!isManaged && (
                    <>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(v) => onToggle(rule, v)}
                        title={t('field.enabled')}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(rule)}
                        title={t('action.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DeleteButton rule={rule} onDelete={onDelete} />
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function maskSecret(secret: string): string {
  if (secret.length <= 4) return '••••';
  return `••••••••-••••-••••-••••-••••••••${secret.slice(-4)}`;
}

function DeleteButton({
  rule,
  onDelete,
}: {
  rule: EffectiveRule;
  onDelete: (rule: EffectiveRule) => void;
}) {
  const { t } = useI18n();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" title={t('action.delete')}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('delete.body', { label: rule.label })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => onDelete(rule)}>
            {t('delete.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
