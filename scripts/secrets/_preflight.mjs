// Shared preflight checks for sync.mjs and list.mjs.
//
// Catches the three failure modes that otherwise surface mid-run as cryptic
// stack traces (ENOENT on the gh binary, 401 from the API mid-sync, ENOENT
// on a missing .env). Cross-platform: pure Node + execFileSync, no shell.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

function tryGh(args) {
  try {
    execFileSync('gh', args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}

function fail(message, hint) {
  process.stderr.write(`\n✗ ${message}\n`);
  if (hint) process.stderr.write(`  → ${hint}\n`);
  process.stderr.write('\n');
  process.exit(1);
}

/**
 * Run preflight checks. Exits non-zero with a helpful message on the first
 * failure. Pass `requireEnv: true` for sync flows that read .env values;
 * read-only flows (like list.mjs) can skip that check.
 */
export function preflight({ requireEnv = false, envPath } = {}) {
  if (!tryGh(['--version'])) {
    fail(
      'gh CLI not found on PATH.',
      'Install from https://cli.github.com — winget / brew / apt / dnf all work.',
    );
  }

  if (!tryGh(['auth', 'status'])) {
    fail('gh CLI is not authenticated.', 'Run: gh auth login   (then re-run this command)');
  }

  // The repo context is implicit: gh resolves it from the cwd's git remote.
  // If the cwd is not inside a GitHub-tracked repo, gh secret list will
  // return non-zero with a clear error — no need to pre-empt it here.

  if (requireEnv && envPath && !existsSync(envPath)) {
    fail(
      `.env not found at ${envPath}.`,
      'Copy .env.example to .env and fill in the values you want to sync.',
    );
  }
}
