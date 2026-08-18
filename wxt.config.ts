import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

/**
 * Public key of the extension signing key pair (`.keys/key.pem`).
 * Pinning it gives a STABLE extension ID across "load unpacked", the signed
 * `.crx` and the Chrome Web Store build — required for enterprise force-install
 * and consistent `chrome.storage` identity.
 *
 * The matching PRIVATE key is never committed (see .gitignore / .keys/) and is
 * provided to CI as the `EXTENSION_PRIVATE_KEY` secret.
 *
 * Resulting extension ID: jncjhkagdjiiohjfmbpmlemdchbkjaib
 */
const EXTENSION_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsqq4sZrp2Vca8EE0DbBOCGiHTUc6nwqYinW8hOFYLhGrntlxdOuj009ACpSIvVmBPkiK9G+JFxroT79p0bv9JK4qOKSrh7iFjaelJ4Xlojedghz668nZbCBcl6gvKqCfnroMpJQbnZZS7ZTfdBW8C97aP5x1ixe+bW1hqX29SmBHgrPmYgs/Vv1HBlv6FUE93ZC3whkL9YGungjNC5ME0PozOcjye4ScfArZZjXDP+ElD9lWb9S+1xpfgfBTX+PFKNcb1xhouq+iH2q6LSjsv5MzjOJT4Gw2gNiOe+gB9CgRdOAHhdwmn2sLg0Dh05WZdjhCbRGtAwtAw9xS/BAiVwIDAQAB';

// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  publicDir: 'src/public',
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    key: EXTENSION_KEY,
    permissions: ['storage', 'declarativeNetRequest', 'declarativeNetRequestFeedback'],
    // Canonical corporate domains work out of the box (no permission prompt).
    //
    // https only: `wss` is not one of Chrome's four documented match-pattern schemes.
    // It is accepted at runtime but REJECTED by Chrome Web Store review as a malformed
    // host permission, which would kill the unlisted-CWS half of our two-channel
    // rollout. WebSocket coverage therefore rides on optional_host_permissions below
    // and is requested at runtime in the same prompt as the https origin.
    host_permissions: ['https://*.app.bauer-group.com/*'],
    // User-added domains request access at runtime (narrower than <all_urls>).
    optional_host_permissions: ['https://*/*', 'wss://*/*'],
    action: {
      default_title: '__MSG_extActionTitle__',
    },
    // Enterprise policy (GPO/MDM) config push via chrome.storage.managed.
    storage: {
      managed_schema: 'managed-schema.json',
    },
  },
});
