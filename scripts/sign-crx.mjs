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
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SRC_DIR = '.output/chrome-mv3';
const OUT_CRX = '.output/header-authenticator.crx';
const OUT_XML = '.output/updates.xml';
const CRX_ASSET = 'header-authenticator.crx';
const XML_ASSET = 'updates.xml';

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

/**
 * Stamp `update_url` into a COPY of the build, and sign that.
 *
 * Chrome requires self-hosted extensions to carry `update_url` in their own
 * manifest: the URL in ExtensionInstallForcelist is used for the INITIAL INSTALL
 * ONLY, and every later update check reads the extension's manifest instead. With
 * the field absent, Chrome falls back to the Web Store update service, finds no
 * listing for this ID, and the force-installed client stays pinned to whatever it
 * first installed — forever, with no error anywhere.
 *
 * It is stamped on a copy rather than on `.output/chrome-mv3` because the Chrome
 * Web Store REJECTS an uploaded package whose manifest declares `update_url`. The
 * two channels need two manifests, and the CWS zip is built from the untouched
 * directory. Copying also removes the hidden dependency on `npm run zip` happening
 * before `npm run sign:crx` in the release workflow.
 *
 * The extension ID is the hash of the pinned public key, so this does not move it.
 */
function stageSignedBuild(updateURL) {
  const stageDir = join(mkdtempSync(join(tmpdir(), 'crx-build-')), 'chrome-mv3');
  cpSync(SRC_DIR, stageDir, { recursive: true });

  const manifestPath = join(stageDir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.update_url = updateURL;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  return stageDir;
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

// Self-hosted URLs — must be anonymously reachable (public GitHub release assets).
const repo = process.env.GITHUB_REPOSITORY ?? 'bauer-group/IP-Chrome-HeaderAuth';
const crxURL = `https://github.com/${repo}/releases/latest/download/${CRX_ASSET}`;
const updateURL = `https://github.com/${repo}/releases/latest/download/${XML_ASSET}`;

const stageDir = stageSignedBuild(updateURL);
await crx3([stageDir], { keyPath, crxPath: OUT_CRX, xmlPath: OUT_XML, crxURL });

console.log(
  `[sign:crx] Wrote ${OUT_CRX} and ${OUT_XML}\n` +
    `[sign:crx] manifest update_url: ${updateURL}\n` +
    `[sign:crx] updates.xml codebase: ${crxURL}`,
);
