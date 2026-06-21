// @ts-check
'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Host Support Policy — single source of truth consumed by the build.
// ---------------------------------------------------------------------------
const SUPPORTED_HOSTS = require('../src/shared/constants/supportedHosts.json');

const target = process.argv[2]; // 'chrome' or 'firefox'

if (!['chrome', 'firefox'].includes(target)) {
  console.error('Usage: node build.js chrome|firefox');
  process.exit(1);
}

const dest = path.join(__dirname, '../dist/');

// ---------------------------------------------------------------------------
// Derive manifest URL patterns from the Host Support Policy
// ---------------------------------------------------------------------------

/** @type {string[]} */
const matchPatterns = SUPPORTED_HOSTS.map(
  /** @param {string} host */
  (host) => `https://${host}/*`
);

// ---------------------------------------------------------------------------
// Load template
// ---------------------------------------------------------------------------

const templatePath = path.join(__dirname, `../manifests/${target}.template.json`);
if (!fs.existsSync(templatePath)) {
  console.error(`Build error: template not found for target "${target}": ${templatePath}`);
  process.exit(1);
}

/** @type {Record<string, any>} */
const manifest = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

// ---------------------------------------------------------------------------
// Inject host-derived fields — fail hard on unexpected template shapes
// ---------------------------------------------------------------------------

try {
  if (target === 'chrome') {
    injectChrome(manifest, matchPatterns);
  } else if (target === 'firefox') {
    injectFirefox(manifest, matchPatterns);
  }
} catch (/** @type {any} */ err) {
  console.error(`Build error: template validation failed for target "${target}": ${err.message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

const pop_ui   = path.join(__dirname, '../src/ui/popup/popup.html');
const mgmt_ui  = path.join(__dirname, '../src/ui/management/management.html');
const shared_css = path.join(__dirname, '../src/ui/styles.css');
const mgmt_css = path.join(__dirname, '../src/ui/management/management.css');
const pop_css  = path.join(__dirname, '../src/ui/popup/popup.css');

fs.writeFileSync(path.join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.copyFileSync(pop_ui,   dest + 'popup.html');
fs.copyFileSync(mgmt_ui,  dest + 'management.html');
fs.copyFileSync(shared_css, dest + 'styles.css');
fs.copyFileSync(mgmt_css, dest + 'management.css');
fs.copyFileSync(pop_css,  dest + 'popup.css');

console.log(`Built ${target} manifest and copied UI files to dist/`);

// ---------------------------------------------------------------------------
// Target-specific injection functions
// ---------------------------------------------------------------------------

/**
 * Injects host-derived fields into a Chrome MV3 manifest template.
 * Fails hard if the template shape is unexpected.
 *
 * Injected fields:
 *   - host_permissions            (array of URL patterns)
 *   - content_scripts[0].matches  (array of URL patterns)
 *   - web_accessible_resources[0].matches (array of URL patterns)
 *
 * @param {Record<string, any>} m
 * @param {string[]} patterns
 */
function injectChrome(m, patterns) {
  // host_permissions
  if (!Array.isArray(m.host_permissions)) {
    throw new Error('Expected manifest.host_permissions to be an array');
  }
  m.host_permissions = patterns;

  // content_scripts[0].matches
  if (!Array.isArray(m.content_scripts) || m.content_scripts.length === 0) {
    throw new Error('Expected manifest.content_scripts to be a non-empty array');
  }
  if (!Array.isArray(m.content_scripts[0].matches)) {
    throw new Error('Expected manifest.content_scripts[0].matches to be an array');
  }
  m.content_scripts[0].matches = patterns;

  // web_accessible_resources[0].matches
  if (!Array.isArray(m.web_accessible_resources) || m.web_accessible_resources.length === 0) {
    throw new Error('Expected manifest.web_accessible_resources to be a non-empty array');
  }
  if (!Array.isArray(m.web_accessible_resources[0].matches)) {
    throw new Error('Expected manifest.web_accessible_resources[0].matches to be an array');
  }
  m.web_accessible_resources[0].matches = patterns;
}

/**
 * Injects host-derived fields into a Firefox MV2 manifest template.
 * Fails hard if the template shape is unexpected.
 *
 * Injected fields:
 *   - permissions (appends URL patterns after non-host entries)
 *   - content_scripts[0].matches
 *
 * Note: Firefox MV2 web_accessible_resources is a flat string array with no
 * per-host matches — no injection needed there.
 *
 * @param {Record<string, any>} m
 * @param {string[]} patterns
 */
function injectFirefox(m, patterns) {
  // permissions — keep non-URL entries, then append host patterns
  if (!Array.isArray(m.permissions)) {
    throw new Error('Expected manifest.permissions to be an array');
  }
  const nonHostPerms = m.permissions.filter(
    /** @param {string} p */
    (p) => !p.startsWith('https://') && !p.startsWith('http://')
  );
  m.permissions = [...nonHostPerms, ...patterns];

  // content_scripts[0].matches
  if (!Array.isArray(m.content_scripts) || m.content_scripts.length === 0) {
    throw new Error('Expected manifest.content_scripts to be a non-empty array');
  }
  if (!Array.isArray(m.content_scripts[0].matches)) {
    throw new Error('Expected manifest.content_scripts[0].matches to be an array');
  }
  m.content_scripts[0].matches = patterns;
}
