// Signs the built extension into a CRX and emits a Chrome update manifest (updates.xml)
// for the self-hosted force-install channel.
//
// Key source (in order): EXTENSION_PRIVATE_KEY env (CI secret) → .keys/key.pem (local).
// Locally, a missing key SKIPS signing so builds work without secrets.
// Under CI it is a HARD FAILURE: a silently unsigned release publishes a GitHub
// Release with no .crx and no updates.xml, and every force-installed client
// keeps the old version with no error surfacing anywhere.
//
// Output: .output/header-authenticator.crx and .output/updates.xml
import crx3 from 'crx3';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SRC_DIR = '.output/chrome-mv3';
const OUT_CRX = '.output/header-authenticator.crx';
const OUT_XML = '.output/updates.xml';
const CRX_ASSET = 'header-authenticator.crx';

function resolveKeyPath() {
  const envKey = process.env.EXTENSION_PRIVATE_KEY;
  if (envKey && envKey.trim()) {
    const dir = mkdtempSync(join(tmpdir(), 'crx-key-'));
    const keyPath = join(dir, 'key.pem');
    writeFileSync(keyPath, envKey, 'utf8');
    return keyPath;
  }
  if (existsSync('.keys/key.pem')) return '.keys/key.pem';
  return null;
}

const keyPath = resolveKeyPath();
if (!keyPath) {
  const message = '[sign:crx] No signing key (EXTENSION_PRIVATE_KEY / .keys/key.pem).';
  if (process.env.CI) {
    console.error(`${message} Refusing to publish an unsigned release.`);
    process.exit(1);
  }
  console.warn(`${message} Skipping (local build).`);
  process.exit(0);
}

if (!existsSync(SRC_DIR)) {
  console.error(`[sign:crx] Build output not found at ${SRC_DIR}. Run "wxt build" first.`);
  process.exit(1);
}

// Self-hosted update URL — must be anonymously reachable (public GitHub release asset).
const repo = process.env.GITHUB_REPOSITORY ?? 'bauer-group/IP-Chrome-HeaderAuth';
const crxURL = `https://github.com/${repo}/releases/latest/download/${CRX_ASSET}`;

await crx3([SRC_DIR], { keyPath, crxPath: OUT_CRX, xmlPath: OUT_XML, crxURL });
console.log(`[sign:crx] Wrote ${OUT_CRX} and ${OUT_XML}\n[sign:crx] update_url codebase: ${crxURL}`);
