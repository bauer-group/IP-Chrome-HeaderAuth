// Sync .env to GitHub repository — Secrets and Variables, routed per-key.
//
// Routing is driven by marker comments in .env.example:
//
//     # @var          → GitHub Repository Variable  (read as ${{ vars.X }})
//     # @secret       → GitHub Repository Secret    (read as ${{ secrets.X }})
//     # @file <path>  → GitHub Repository Secret whose value is read from
//                       <path> on disk, NOT from .env
//     # @local        → never synced; cleaned up if it exists in either bucket
//     (no marker)     → defaults to @secret (safety fallback)
//
// The marker applies to the next KEY=… line below it (blank lines and other
// comments in between are fine). See the docs at the top of .env.example.
//
// WHY @file EXISTS (this repo's addition to the shared script)
//   The extension signing key is a multi-line PEM living at .keys/key.pem. It
//   is the single local source of truth: sign:crx reads that path, and copying
//   it into .env would create a second copy that can silently drift from the
//   first. @file keys therefore:
//     * are read from disk at push time and streamed to gh on STDIN (a
//       multi-line value through argv is not portable on Windows),
//     * need no line in .env at all — the schema entry is the declaration,
//     * are NEVER deleted. A missing local file means "I don't have this key
//       on this machine", not "retire the CI secret". Deleting on absence
//       would let any teammate without the key wipe the live signing secret.
//
// EXTENSION IDENTITY GUARD
//   The signing key alone determines the extension ID. Pushing the WRONG
//   key.pem yields a green pipeline, a valid CRX and a DIFFERENT extension ID —
//   every force-install policy then points at nothing, with no error anywhere.
//   So before pushing, the public half is derived from the local key and
//   compared against the key pinned in wxt.config.ts. Mismatch aborts.
//
// Two modes — same code path, one flag:
//   --push-only : ADD/OVERWRITE only (used by `npm run secrets:push`).
//   default     : also DELETE GitHub vars/secrets that have been removed from
//                 .env, scoped to keys listed in .env.example.
//
// Re-classification (e.g. flipping a key from @secret to @var) is handled
// transparently: the value is pushed to the new bucket AND removed from the
// old one in the same run, so vars and secrets never drift.
//
// Why the .env.example gate (delete mode only):
//   Not every GitHub secret/variable belongs to this flow. Org-level secrets
//   inherited via `secrets: inherit` (GitGuardian, Gitleaks, Codecov,
//   SonarQube) are not repo entries at all and never appear here; anything
//   else set out-of-band stays untouched because it is not in .env.example.
//
// No interactive prompts: typing `npm run secrets:sync` is treated as
// informed consent. Use `npm run secrets:sync:dry` first to inspect the plan.
//
// Usage:
//   npm run secrets:push                  # add/overwrite (no deletes)
//   npm run secrets:sync                  # add/overwrite + delete + relocate
//   npm run secrets:sync:dry              # show plan, no changes

import { execFileSync } from 'node:child_process';
import { createHash, createPrivateKey, createPublicKey } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { preflight } from './_preflight.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

const { values } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    'push-only': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  process.stdout.write(`Usage: npm run secrets:sync [-- options]

Pushes every KEY=VALUE from .env to GitHub Actions, routing each key to either
Repository Variables or Secrets based on # @var / # @secret / # @file / # @local
markers in .env.example (default: @secret). Then deletes GitHub entries that are
listed in .env.example but no longer in .env. External entries are left alone.

@file keys read their value from disk instead of .env and are never deleted.

No prompts: applies the plan immediately. Use --dry-run (or the
\`secrets:sync:dry\` npm script) first if you want to inspect.

Options:
  --push-only Skip the delete step — add/overwrite only.
  --dry-run   Show the sync plan without making any changes.
  -h, --help  Show this message.
`);
  process.exit(0);
}

// -----------------------------------------------------------------------------
// .env / .env.example parsing
// -----------------------------------------------------------------------------

const KEY_RE = /^([A-Z][A-Z0-9_]*)\s*=(.*)$/;
const MARKER_RE = /^#\s*@(var|secret|local|file)\b[ \t]*(\S*)/i;

/**
 * Parse a .env-style file into a Map<key, { value, classification, file }>.
 *
 * - In .env (values file): reads KEY=VALUE pairs. Classification comes from the
 *   schema map argument; unknown keys default to 'secret'.
 * - In .env.example (schema file): set `schemaOnly: true`. Returns entries with
 *   `value: null`, the classification from the marker, and for @file the source
 *   path. Both commented and uncommented KEY=… lines are recognised so the
 *   universe covers opt-in keys too.
 */
function parseEnv(filepath, { schemaOnly = false, schema = null } = {}) {
  const map = new Map();
  let content;
  try {
    content = readFileSync(filepath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return map;
    throw err;
  }

  // A marker is consumed by the next KEY line — section headings, blank lines
  // and other comments in between are tolerated.
  let pendingMarker = null;
  let pendingFile = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const markerMatch = line.match(MARKER_RE);
    if (markerMatch) {
      pendingMarker = markerMatch[1].toLowerCase();
      pendingFile = pendingMarker === 'file' ? markerMatch[2] || null : null;
      continue;
    }

    const isComment = line.startsWith('#');
    // In schema mode, look at commented KEY=… lines too (opt-in entries).
    // In values mode, ignore comments entirely.
    if (isComment && !schemaOnly) continue;

    const stripped = isComment ? line.replace(/^#+\s*/, '') : line;
    const match = stripped.match(KEY_RE);
    if (!match) continue;

    const [, key, rawValue] = match;
    const schemaEntry = schema?.get(key);
    const classification = pendingMarker ?? schemaEntry?.classification ?? 'secret';
    const file = pendingFile ?? schemaEntry?.file ?? null;
    pendingMarker = null;
    pendingFile = null;

    if (schemaOnly) {
      map.set(key, { value: null, classification, file });
    } else {
      // Strip surrounding quotes if present, leave the value as-is otherwise.
      const value = rawValue.replace(/^["']|["']$/g, '');
      map.set(key, { value, classification, file });
    }
  }

  return map;
}

// -----------------------------------------------------------------------------
// Extension identity guard
// -----------------------------------------------------------------------------

/** Chrome's extension ID: sha256 of the SPKI DER, first 16 bytes, nibbles → a-p. */
function extensionIdFromSpki(spkiDer) {
  return [...createHash('sha256').update(spkiDer).digest().subarray(0, 16)]
    .map((b) => String.fromCharCode(97 + (b >> 4)) + String.fromCharCode(97 + (b & 15)))
    .join('');
}

function spkiBase64FromPem(pem) {
  const spki = createPublicKey(createPrivateKey(pem)).export({ type: 'spki', format: 'der' });
  return { base64: spki.toString('base64'), id: extensionIdFromSpki(spki) };
}

/**
 * Refuse to push a signing key that would change the extension ID.
 *
 * wxt.config.ts pins the PUBLIC half as `EXTENSION_KEY`; the private key must
 * derive exactly that. If it does not, the built CRX gets a different ID and
 * every ExtensionInstallForcelist entry silently stops matching.
 */
function assertSigningKeyMatchesManifest(pemPath) {
  const manifestSource = readFileSync(resolve(repoRoot, 'wxt.config.ts'), 'utf8');
  const pinned = /const EXTENSION_KEY =\s*'([^']+)'/.exec(manifestSource)?.[1];
  if (!pinned) {
    process.stderr.write('\n✗ Could not find EXTENSION_KEY in wxt.config.ts.\n\n');
    process.exit(1);
  }

  let derived;
  try {
    derived = spkiBase64FromPem(readFileSync(pemPath, 'utf8'));
  } catch (err) {
    process.stderr.write(`\n✗ ${pemPath} is not a readable private key.\n  → ${err.message}\n\n`);
    process.exit(1);
  }

  if (derived.base64 !== pinned) {
    const expected = extensionIdFromSpki(Buffer.from(pinned, 'base64'));
    process.stderr.write(
      `\n✗ Signing key does not match the key pinned in wxt.config.ts.\n` +
        `    expected extension ID : ${expected}\n` +
        `    this key would give   : ${derived.id}\n` +
        `  → Pushing it would silently break every force-install policy.\n` +
        `    Use the correct .keys/key.pem, or update EXTENSION_KEY deliberately.\n\n`,
    );
    process.exit(1);
  }

  return derived.id;
}

// -----------------------------------------------------------------------------
// gh CLI helpers
// -----------------------------------------------------------------------------

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

function ghQuiet(args, input) {
  execFileSync('gh', args, {
    stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    ...(input === undefined ? {} : { input }),
  });
}

function listGhEntries(kind) {
  // kind: 'secret' | 'variable'
  const output = gh([kind, 'list', '--json', 'name']);
  return new Set(JSON.parse(output).map((entry) => entry.name));
}

function setGhEntry(kind, name, value, { viaStdin = false } = {}) {
  // Single-line values go through --body (execFileSync's argv array escapes
  // them correctly). Multi-line values (PEM) go through stdin instead: a
  // newline-bearing argv entry is not portable across Windows' command line.
  if (viaStdin) ghQuiet([kind, 'set', name], value);
  else ghQuiet([kind, 'set', name, '--body', value]);
}

function deleteGhEntry(kind, name) {
  ghQuiet([kind, 'delete', name]);
}

// -----------------------------------------------------------------------------
// Plan computation
// -----------------------------------------------------------------------------

const pushOnly = values['push-only'];
const envPath = resolve(repoRoot, '.env');
const examplePath = resolve(repoRoot, '.env.example');

// .env is never mandatory here: @file keys are read from disk, so a machine
// that only holds the signing key can still push it without inventing a .env.
// A missing .env is surfaced in the plan instead of aborting.
preflight();

const schema = parseEnv(examplePath, { schemaOnly: true });
const envEntries = parseEnv(envPath, { schema });
const envMissing = !existsSync(envPath);
const declaresEnvKeys = [...schema.values()].some((entry) => entry.classification !== 'file');

const ghSecrets = listGhEntries('secret');
const ghVariables = listGhEntries('variable');

// Classify the intended target for each key. Four buckets emerge:
//   * targetByKey   → keys that get pushed (variable or secret)
//   * fileKeys      → @file: value from disk, never deleted
//   * localKeys     → @local: never pushed, CI residue cleaned up
//   * emptyKeys     → declared but empty: "not configured here", treat as absent
const targetByKey = new Map();
const fileKeys = new Map(); // key → resolved absolute path
const missingFileKeys = new Map(); // key → declared path (source absent locally)
const localKeys = new Set();
const emptyKeys = new Set();

// @file entries are schema-driven: they are declared in .env.example and read
// from disk, so they are handled independently of whether .env mentions them.
for (const [key, entry] of schema) {
  if (entry.classification !== 'file') continue;
  if (!entry.file) {
    process.stderr.write(`\n✗ ${key} is marked @file without a path in .env.example.\n\n`);
    process.exit(1);
  }
  const abs = resolve(repoRoot, entry.file);
  if (existsSync(abs)) {
    fileKeys.set(key, abs);
    targetByKey.set(key, 'secret');
  } else {
    missingFileKeys.set(key, entry.file);
  }
}

for (const [key, { value, classification }] of envEntries) {
  if (classification === 'file') continue; // already handled from the schema
  if (classification === 'local') {
    localKeys.add(key);
    continue;
  }
  // An empty value means "not configured on this machine", never "push an
  // empty string". Copying .env.example to .env leaves every optional key
  // blank, and pushing those would hand the workflows empty credentials that
  // look configured. GitHub's variables API rejects empty bodies outright
  // (HTTP 422), and an absent variable resolves to '' in `${{ vars.X }}`
  // anyway — so absent and empty are indistinguishable to a workflow.
  if (value === '') {
    emptyKeys.add(key);
    continue;
  }
  targetByKey.set(key, classification === 'var' ? 'variable' : 'secret');
}

// Run the identity guard as part of planning, so `--dry-run` surfaces a wrong
// key before anyone applies the plan.
let verifiedExtensionId = null;
if (fileKeys.has('EXTENSION_PRIVATE_KEY')) {
  verifiedExtensionId = assertSigningKeyMatchesManifest(fileKeys.get('EXTENSION_PRIVATE_KEY'));
}

// Per-bucket plan
const plan = {
  variable: { add: [], update: [], delete: [], relocate: [], orphan: [] },
  secret: { add: [], update: [], delete: [], relocate: [], orphan: [] },
};

function scheduleRemoval(bucketName, key) {
  if (pushOnly) plan[bucketName].orphan.push(key);
  else plan[bucketName].delete.push(key);
}

// @local + empty @var keys: not pushed anywhere. If they currently live in
// either GitHub bucket (left over from earlier syncs), remove them.
for (const key of [...localKeys, ...emptyKeys]) {
  if (ghVariables.has(key)) scheduleRemoval('variable', key);
  if (ghSecrets.has(key)) scheduleRemoval('secret', key);
}

// Pushable keys: normal add/update + relocate from the opposite bucket.
for (const [key, target] of targetByKey) {
  const bucket = plan[target];
  const live = target === 'variable' ? ghVariables : ghSecrets;
  if (live.has(key)) bucket.update.push(key);
  else bucket.add.push(key);

  const opposite = target === 'variable' ? 'secret' : 'variable';
  const oppositeLive = target === 'variable' ? ghSecrets : ghVariables;
  if (oppositeLive.has(key)) {
    if (pushOnly) plan[opposite].orphan.push(key);
    else plan[opposite].relocate.push(key);
  }
}

// Deletions (sync mode only): keys in the schema universe but not in .env,
// scoped per bucket. @file keys are exempt — see the header.
const externalSecrets = [];
const externalVariables = [];
if (!pushOnly) {
  for (const name of ghSecrets) {
    if (envEntries.has(name) || targetByKey.has(name) || missingFileKeys.has(name)) continue;
    const schemaEntry = schema.get(name);
    if (schemaEntry && schemaEntry.classification !== 'var') plan.secret.delete.push(name);
    else if (!schemaEntry) externalSecrets.push(name);
  }
  for (const name of ghVariables) {
    if (envEntries.has(name) || targetByKey.has(name)) continue;
    const schemaEntry = schema.get(name);
    if (schemaEntry?.classification === 'var') plan.variable.delete.push(name);
    else if (!schemaEntry) externalVariables.push(name);
  }
}

for (const bucket of Object.values(plan)) {
  for (const list of Object.values(bucket)) list.sort();
}
externalSecrets.sort();
externalVariables.sort();

// -----------------------------------------------------------------------------
// Render plan
// -----------------------------------------------------------------------------

const universeVarCount = [...schema.values()].filter((v) => v.classification === 'var').length;
const universeFileCount = [...schema.values()].filter((v) => v.classification === 'file').length;
const universeSecretCount = schema.size - universeVarCount - universeFileCount;

console.log('');
console.log(
  `  mode             : ${pushOnly ? 'push-only (add/overwrite)' : 'sync (add + delete)'}`,
);
console.log(`  .env             : ${envEntries.size} key(s)`);
console.log(
  `  .env.example     : ${schema.size} managed key(s) — ` +
    `${universeVarCount} var, ${universeSecretCount} secret, ${universeFileCount} file`,
);
console.log(`  GitHub Variables : ${ghVariables.size}`);
console.log(`  GitHub Secrets   : ${ghSecrets.size}`);
if (verifiedExtensionId) {
  console.log(`  signing key      : ✓ derives extension ID ${verifiedExtensionId}`);
}
console.log('');
console.log('Plan:');

function renderBucket(label, b) {
  const hasAny =
    b.add.length || b.update.length || b.delete.length || b.relocate.length || b.orphan.length;
  if (!hasAny) {
    console.log(`  ${label.padEnd(10)} (no changes)`);
    return;
  }
  console.log(`  ${label}:`);
  if (b.add.length) console.log(`    + add      : ${b.add.length} — ${b.add.join(', ')}`);
  if (b.update.length) console.log(`    ~ update   : ${b.update.length} — ${b.update.join(', ')}`);
  if (!pushOnly && b.delete.length)
    console.log(`    - DELETE   : ${b.delete.length} — ${b.delete.join(', ')}`);
  if (!pushOnly && b.relocate.length)
    console.log(
      `    ↪ relocate : ${b.relocate.length} → moving to other bucket: ${b.relocate.join(', ')}`,
    );
  if (pushOnly && b.orphan.length)
    console.log(
      `    ⚠ orphan   : ${b.orphan.length} — should be elsewhere or absent. ` +
        `Run \`npm run secrets:sync\` to clean up: ${b.orphan.join(', ')}`,
    );
}

renderBucket('Variables', plan.variable);
renderBucket('Secrets  ', plan.secret);

if (fileKeys.size) {
  console.log('');
  console.log('  · file-sourced (value read from disk, never deleted):');
  for (const [key, path] of fileKeys) {
    console.log(`      ${key} ← ${path.replace(repoRoot, '.').replace(/\\/g, '/')}`);
  }
}

if (missingFileKeys.size) {
  console.log('');
  console.log('  · file-sourced but MISSING locally (skipped, CI entry left intact):');
  for (const [key, path] of missingFileKeys) {
    console.log(`      ${key} ← ${path}  (not on this machine)`);
  }
}

if (envMissing && declaresEnvKeys) {
  console.log('');
  console.log('  · no .env on this machine — only file-sourced keys are in scope.');
  console.log('    Copy .env.example to .env to manage the rest.');
}

if (localKeys.size || emptyKeys.size) {
  console.log('');
  console.log('  · skipped (not pushed to either bucket):');
  if (localKeys.size)
    console.log(`      @local       : ${localKeys.size} — ${[...localKeys].sort().join(', ')}`);
  if (emptyKeys.size)
    console.log(`      empty        : ${emptyKeys.size} — ${[...emptyKeys].sort().join(', ')}`);
}

if (!pushOnly && (externalVariables.length || externalSecrets.length)) {
  console.log('');
  console.log('  · external (not in .env.example, left alone):');
  if (externalVariables.length)
    console.log(`      vars    : ${externalVariables.length} — ${externalVariables.join(', ')}`);
  if (externalSecrets.length)
    console.log(`      secrets : ${externalSecrets.length} — ${externalSecrets.join(', ')}`);
}

if (values['dry-run']) {
  console.log('\n(dry-run: no changes applied)');
  process.exit(0);
}

// -----------------------------------------------------------------------------
// Apply
// -----------------------------------------------------------------------------

const totalDeletes =
  plan.variable.delete.length +
  plan.secret.delete.length +
  plan.variable.relocate.length +
  plan.secret.relocate.length;
const totalWrites =
  plan.variable.add.length +
  plan.variable.update.length +
  plan.secret.add.length +
  plan.secret.update.length;

if (totalDeletes === 0 && totalWrites === 0) {
  console.log('\n✓ Nothing to sync.');
  process.exit(0);
}

console.log('');

for (const [key, target] of targetByKey) {
  const filePath = fileKeys.get(key);
  const value = filePath ? readFileSync(filePath, 'utf8') : envEntries.get(key).value;
  setGhEntry(target, key, value, { viaStdin: Boolean(filePath) });
  console.log(`✓ Set ${target} ${key}${filePath ? ' (from file)' : ''}`);
}

for (const name of plan.variable.relocate) {
  deleteGhEntry('variable', name);
  console.log(`✓ Removed variable ${name} (now @secret)`);
}
for (const name of plan.secret.relocate) {
  deleteGhEntry('secret', name);
  console.log(`✓ Removed secret ${name} (now @var)`);
}

for (const name of plan.variable.delete) {
  deleteGhEntry('variable', name);
  console.log(`✓ Deleted variable ${name}`);
}
for (const name of plan.secret.delete) {
  deleteGhEntry('secret', name);
  console.log(`✓ Deleted secret ${name}`);
}

console.log(`\n✓ ${pushOnly ? 'Push' : 'Sync'} complete.`);
