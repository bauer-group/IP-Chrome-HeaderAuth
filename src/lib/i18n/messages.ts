/**
 * Lightweight, type-safe message catalog (DE/EN). Chosen over a heavyweight i18n
 * runtime because the extension has a small string set and needs an in-app locale
 * toggle — which chrome.i18n cannot do. `en` is the source of truth for the key set;
 * `de` must cover the same keys (enforced by `satisfies` below).
 */
const en = {
  'app.name': 'BAUER GROUP Header Authenticator',

  // Popup
  'popup.master': 'Protection',
  'popup.protectedDomains': 'Protected domains',
  'popup.activeCount': '{count} active',
  'popup.statusActive': 'Active',
  'popup.statusNeedsAccess': 'Needs access',
  'popup.statusDisabled': 'Disabled',
  'popup.statusManaged': 'Managed',
  'popup.wssBestEffort': 'WSS best-effort',
  'popup.grant': 'Grant access',
  'popup.noRules': 'No rules yet.',
  'popup.openSettings': 'Open settings',

  // Options shell
  'options.title': 'BAUER GROUP Header Authenticator',
  'options.subtitle': 'Manage protected domains and their authentication secrets.',
  'options.master': 'Header injection',
  'options.masterHint': 'Master switch for all rules on this device.',
  'options.addRule': 'Add rule',
  'options.rules': 'Rules',

  // Empty state
  'empty.title': 'No protection rules yet',
  'empty.body': 'Add a rule to start sending the authentication header to a protected service.',
  'empty.cta': 'Add your first rule',

  // Table columns
  'col.status': 'Status',
  'col.label': 'Name',
  'col.domains': 'Domains',
  'col.header': 'Header',
  'col.secret': 'Secret',
  'col.actions': 'Actions',

  // Managed
  'managed.badge': 'Managed by your organization',
  'managed.hint': 'This rule is provisioned by your organization and cannot be edited here.',

  // Rule dialog
  'dialog.addTitle': 'Add rule',
  'dialog.editTitle': 'Edit rule',
  'dialog.description': 'A rule injects a header with your secret into requests to its domains.',
  'field.label': 'Name',
  'field.labelPh': 'e.g. BAUER GROUP Apps',
  'field.domains': 'Domains',
  'field.domainsPh': 'app.bauer-group.com',
  'field.domainsHint': 'Bare domain or *.wildcard. Subdomains are matched automatically.',
  'field.addDomain': 'Add',
  'field.header': 'Header name',
  'field.headerHint': 'The HTTP header the secret is sent in.',
  'field.secret': 'Secret (GUID)',
  'field.secretPh': '00000000-0000-0000-0000-000000000000',
  'field.generate': 'Generate',
  'field.reveal': 'Reveal',
  'field.hide': 'Hide',
  'field.copy': 'Copy',
  'field.syncSecret': 'Sync secret across devices',
  'field.syncSecretHint': 'Off keeps the secret on this device only (not in the account cloud).',
  'field.enabled': 'Enabled',

  // Actions
  'action.save': 'Save',
  'action.cancel': 'Cancel',
  'action.delete': 'Delete',
  'action.edit': 'Edit',
  'action.close': 'Close',

  // Delete confirm
  'delete.title': 'Delete rule?',
  'delete.body': 'The rule "{label}" will be removed and its host access revoked.',
  'delete.confirm': 'Delete',

  // Import / export
  'io.export': 'Export',
  'io.import': 'Import',

  // Language
  'lang.label': 'Language',

  // Toasts
  'toast.saved': 'Saved.',
  'toast.deleted': 'Rule deleted.',
  'toast.permGranted': 'Access granted.',
  'toast.permDenied': 'Access was not granted — the rule stays inactive.',
  'toast.imported': 'Configuration imported.',
  'toast.importError': 'Import failed: invalid configuration file.',
  'toast.exported': 'Configuration exported.',
  'toast.copied': 'Copied to clipboard.',
} as const;

export type MessageKey = keyof typeof en;

const de = {
  'app.name': 'BAUER GROUP Header Authenticator',

  'popup.master': 'Schutz',
  'popup.protectedDomains': 'Geschützte Domains',
  'popup.activeCount': '{count} aktiv',
  'popup.statusActive': 'Aktiv',
  'popup.statusNeedsAccess': 'Zugriff nötig',
  'popup.statusDisabled': 'Deaktiviert',
  'popup.statusManaged': 'Verwaltet',
  'popup.wssBestEffort': 'WSS best-effort',
  'popup.grant': 'Zugriff erteilen',
  'popup.noRules': 'Noch keine Regeln.',
  'popup.openSettings': 'Einstellungen öffnen',

  'options.title': 'BAUER GROUP Header Authenticator',
  'options.subtitle': 'Geschützte Domains und ihre Authentifizierungs-Secrets verwalten.',
  'options.master': 'Header-Injektion',
  'options.masterHint': 'Hauptschalter für alle Regeln auf diesem Gerät.',
  'options.addRule': 'Regel hinzufügen',
  'options.rules': 'Regeln',

  'empty.title': 'Noch keine Schutzregeln',
  'empty.body':
    'Legen Sie eine Regel an, um den Authentifizierungs-Header an einen geschützten Dienst zu senden.',
  'empty.cta': 'Erste Regel anlegen',

  'col.status': 'Status',
  'col.label': 'Name',
  'col.domains': 'Domains',
  'col.header': 'Header',
  'col.secret': 'Secret',
  'col.actions': 'Aktionen',

  'managed.badge': 'Von Ihrer Organisation verwaltet',
  'managed.hint':
    'Diese Regel wird von Ihrer Organisation bereitgestellt und kann hier nicht bearbeitet werden.',

  'dialog.addTitle': 'Regel hinzufügen',
  'dialog.editTitle': 'Regel bearbeiten',
  'dialog.description':
    'Eine Regel injiziert einen Header mit Ihrem Secret in Requests an ihre Domains.',
  'field.label': 'Name',
  'field.labelPh': 'z. B. BAUER GROUP Apps',
  'field.domains': 'Domains',
  'field.domainsPh': 'app.bauer-group.com',
  'field.domainsHint': 'Reine Domain oder *.Wildcard. Subdomains werden automatisch erfasst.',
  'field.addDomain': 'Hinzufügen',
  'field.header': 'Header-Name',
  'field.headerHint': 'Der HTTP-Header, in dem das Secret gesendet wird.',
  'field.secret': 'Secret (GUID)',
  'field.secretPh': '00000000-0000-0000-0000-000000000000',
  'field.generate': 'Generieren',
  'field.reveal': 'Anzeigen',
  'field.hide': 'Verbergen',
  'field.copy': 'Kopieren',
  'field.syncSecret': 'Secret geräteübergreifend synchronisieren',
  'field.syncSecretHint': 'Aus hält das Secret nur auf diesem Gerät (nicht in der Konto-Cloud).',
  'field.enabled': 'Aktiviert',

  'action.save': 'Speichern',
  'action.cancel': 'Abbrechen',
  'action.delete': 'Löschen',
  'action.edit': 'Bearbeiten',
  'action.close': 'Schließen',

  'delete.title': 'Regel löschen?',
  'delete.body': 'Die Regel „{label}" wird entfernt und ihr Host-Zugriff widerrufen.',
  'delete.confirm': 'Löschen',

  'io.export': 'Exportieren',
  'io.import': 'Importieren',

  'lang.label': 'Sprache',

  'toast.saved': 'Gespeichert.',
  'toast.deleted': 'Regel gelöscht.',
  'toast.permGranted': 'Zugriff erteilt.',
  'toast.permDenied': 'Zugriff wurde nicht erteilt — die Regel bleibt inaktiv.',
  'toast.imported': 'Konfiguration importiert.',
  'toast.importError': 'Import fehlgeschlagen: ungültige Konfigurationsdatei.',
  'toast.exported': 'Konfiguration exportiert.',
  'toast.copied': 'In die Zwischenablage kopiert.',
} satisfies Record<MessageKey, string>;

export const messages = { en, de };
export type Locale = keyof typeof messages;
