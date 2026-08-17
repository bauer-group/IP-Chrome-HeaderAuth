// Show what's currently in GitHub for this repo, both Variables and Secrets.
//
// `gh secret list` and `gh variable list` only cover one bucket each. Since
// the sync flow now classifies keys per @var / @secret marker, listing only
// secrets gives a misleading half-picture. This wraps both into one view.
//
// Usage:
//   npm run secrets:list

import { execFileSync } from 'node:child_process';

import { preflight } from './_preflight.mjs';

preflight();

function listEntries(kind) {
  const output = execFileSync('gh', [kind, 'list', '--json', 'name,updatedAt'], {
    encoding: 'utf8',
  });
  return JSON.parse(output).sort((a, b) => a.name.localeCompare(b.name));
}

const variables = listEntries('variable');
const secrets = listEntries('secret');

function render(label, entries) {
  console.log(`\n${label} (${entries.length}):`);
  if (entries.length === 0) {
    console.log('  (none)');
    return;
  }
  const width = Math.max(...entries.map((e) => e.name.length));
  for (const entry of entries) {
    const updated = entry.updatedAt ? `  ${entry.updatedAt}` : '';
    console.log(`  ${entry.name.padEnd(width)}${updated}`);
  }
}

render('Variables', variables);
render('Secrets', secrets);
console.log('');
