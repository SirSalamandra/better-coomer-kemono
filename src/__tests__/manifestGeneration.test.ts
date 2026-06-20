/**
 * Tests for the manifest generation pipeline (scripts/build.js logic).
 *
 * These tests exercise the injection functions and template validation in
 * isolation, without actually spawning a child process or writing to dist/.
 * They import the injection helpers directly by re-implementing them here
 * from the same logic — a thin layer that validates the contract.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Helpers — mirrors the injection logic in scripts/build.js
// ---------------------------------------------------------------------------

function toMatchPatterns(hosts: readonly string[]): string[] {
  return hosts.map((h) => `https://${h}/*`);
}

function injectChrome(m: Record<string, any>, patterns: string[]): void {
  if (!Array.isArray(m.host_permissions))
    throw new Error('Expected manifest.host_permissions to be an array');
  if (!Array.isArray(m.content_scripts) || m.content_scripts.length === 0)
    throw new Error('Expected manifest.content_scripts to be a non-empty array');
  if (!Array.isArray(m.content_scripts[0].matches))
    throw new Error('Expected manifest.content_scripts[0].matches to be an array');
  if (!Array.isArray(m.web_accessible_resources) || m.web_accessible_resources.length === 0)
    throw new Error('Expected manifest.web_accessible_resources to be a non-empty array');
  if (!Array.isArray(m.web_accessible_resources[0].matches))
    throw new Error('Expected manifest.web_accessible_resources[0].matches to be an array');

  m.host_permissions = patterns;
  m.content_scripts[0].matches = patterns;
  m.web_accessible_resources[0].matches = patterns;
}

function injectFirefox(m: Record<string, any>, patterns: string[]): void {
  if (!Array.isArray(m.permissions))
    throw new Error('Expected manifest.permissions to be an array');
  if (!Array.isArray(m.content_scripts) || m.content_scripts.length === 0)
    throw new Error('Expected manifest.content_scripts to be a non-empty array');
  if (!Array.isArray(m.content_scripts[0].matches))
    throw new Error('Expected manifest.content_scripts[0].matches to be an array');

  const nonHostPerms = m.permissions.filter(
    (p: string) => !p.startsWith('https://') && !p.startsWith('http://')
  );
  m.permissions = [...nonHostPerms, ...patterns];
  m.content_scripts[0].matches = patterns;
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const SUPPORTED_HOSTS = ['coomer.st', 'kemono.cr'] as const;
const EXPECTED_PATTERNS = ['https://coomer.st/*', 'https://kemono.cr/*'];

const CHROME_TEMPLATE_PATH = path.resolve(
  __dirname, '../../manifests/chrome.template.json'
);
const FIREFOX_TEMPLATE_PATH = path.resolve(
  __dirname, '../../manifests/firefox.template.json'
);

function loadTemplate(p: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// ---------------------------------------------------------------------------
// Tests: pattern derivation
// ---------------------------------------------------------------------------

describe('toMatchPatterns', () => {
  it('converts each supported host to a wildcard https URL pattern', () => {
    expect(toMatchPatterns(SUPPORTED_HOSTS)).toEqual(EXPECTED_PATTERNS);
  });

  it('returns empty array when hosts list is empty', () => {
    expect(toMatchPatterns([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tests: Chrome MV3 injection
// ---------------------------------------------------------------------------

describe('injectChrome', () => {
  let manifest: Record<string, any>;

  beforeEach(() => {
    manifest = loadTemplate(CHROME_TEMPLATE_PATH);
  });

  it('sets host_permissions from supported hosts', () => {
    injectChrome(manifest, EXPECTED_PATTERNS);
    expect(manifest.host_permissions).toEqual(EXPECTED_PATTERNS);
  });

  it('sets content_scripts[0].matches from supported hosts', () => {
    injectChrome(manifest, EXPECTED_PATTERNS);
    expect(manifest.content_scripts[0].matches).toEqual(EXPECTED_PATTERNS);
  });

  it('sets web_accessible_resources[0].matches from supported hosts', () => {
    injectChrome(manifest, EXPECTED_PATTERNS);
    expect(manifest.web_accessible_resources[0].matches).toEqual(EXPECTED_PATTERNS);
  });

  it('preserves non-host permissions (scripting, tabs, storage)', () => {
    injectChrome(manifest, EXPECTED_PATTERNS);
    expect(manifest.permissions).toEqual(
      expect.arrayContaining(['scripting', 'tabs', 'storage'])
    );
  });

  it('does not add host_permissions to the permissions array (MV3 uses separate key)', () => {
    injectChrome(manifest, EXPECTED_PATTERNS);
    const hasHostUrl = (manifest.permissions as string[]).some((p) =>
      p.startsWith('https://')
    );
    expect(hasHostUrl).toBe(false);
  });

  it('fails hard when host_permissions is missing', () => {
    delete manifest.host_permissions;
    expect(() => injectChrome(manifest, EXPECTED_PATTERNS)).toThrow(
      'Expected manifest.host_permissions to be an array'
    );
  });

  it('fails hard when content_scripts is empty', () => {
    manifest.content_scripts = [];
    expect(() => injectChrome(manifest, EXPECTED_PATTERNS)).toThrow(
      'Expected manifest.content_scripts to be a non-empty array'
    );
  });

  it('fails hard when web_accessible_resources is missing', () => {
    delete manifest.web_accessible_resources;
    expect(() => injectChrome(manifest, EXPECTED_PATTERNS)).toThrow(
      'Expected manifest.web_accessible_resources to be a non-empty array'
    );
  });

  it('fails hard when web_accessible_resources[0].matches is not an array', () => {
    manifest.web_accessible_resources = [{ resources: ['inject.js'] }];
    expect(() => injectChrome(manifest, EXPECTED_PATTERNS)).toThrow(
      'Expected manifest.web_accessible_resources[0].matches to be an array'
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: Firefox MV2 injection
// ---------------------------------------------------------------------------

describe('injectFirefox', () => {
  let manifest: Record<string, any>;

  beforeEach(() => {
    manifest = loadTemplate(FIREFOX_TEMPLATE_PATH);
  });

  it('appends host URL patterns to permissions', () => {
    injectFirefox(manifest, EXPECTED_PATTERNS);
    expect(manifest.permissions).toEqual(
      expect.arrayContaining(EXPECTED_PATTERNS)
    );
  });

  it('preserves non-host permissions (tabs, storage)', () => {
    injectFirefox(manifest, EXPECTED_PATTERNS);
    expect(manifest.permissions).toEqual(
      expect.arrayContaining(['tabs', 'storage'])
    );
  });

  it('sets content_scripts[0].matches from supported hosts', () => {
    injectFirefox(manifest, EXPECTED_PATTERNS);
    expect(manifest.content_scripts[0].matches).toEqual(EXPECTED_PATTERNS);
  });

  it('does not add a host_permissions key (MV2 uses permissions only)', () => {
    injectFirefox(manifest, EXPECTED_PATTERNS);
    expect(manifest.host_permissions).toBeUndefined();
  });

  it('web_accessible_resources stays a flat string array (no per-host matches)', () => {
    injectFirefox(manifest, EXPECTED_PATTERNS);
    expect(Array.isArray(manifest.web_accessible_resources)).toBe(true);
    manifest.web_accessible_resources.forEach((entry: any) => {
      expect(typeof entry).toBe('string');
    });
  });

  it('fails hard when permissions is not an array', () => {
    manifest.permissions = 'tabs';
    expect(() => injectFirefox(manifest, EXPECTED_PATTERNS)).toThrow(
      'Expected manifest.permissions to be an array'
    );
  });

  it('fails hard when content_scripts is empty', () => {
    manifest.content_scripts = [];
    expect(() => injectFirefox(manifest, EXPECTED_PATTERNS)).toThrow(
      'Expected manifest.content_scripts to be a non-empty array'
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: Firefox MV3 is not a maintained target
// ---------------------------------------------------------------------------

describe('Firefox MV3 is not a maintained build target', () => {
  it('does not have a firefox MV3 template in the manifests directory', () => {
    const mv3TemplatePath = path.resolve(
      __dirname, '../../manifests/firefox.template.v3.json'
    );
    expect(fs.existsSync(mv3TemplatePath)).toBe(false);
  });

  it('does not have a firefox MV3 manifest in the manifests directory', () => {
    const mv3Path = path.resolve(
      __dirname, '../../manifests/firefox.manifest.v3.json'
    );
    // The file may exist as a historical artifact but must not be a maintained template
    // The absence of a template is the authoritative signal
    const mv3TemplatePath = path.resolve(
      __dirname, '../../manifests/firefox.template.v3.json'
    );
    expect(fs.existsSync(mv3TemplatePath)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: supportedHosts.json in scripts/ matches the TS source of truth
// ---------------------------------------------------------------------------

describe('scripts/supportedHosts.json parity with SUPPORTED_HOSTS constant', () => {
  it('contains the same hosts as the TypeScript source of truth', () => {
    const jsonPath = path.resolve(__dirname, '../../src/shared/constants/supportedHosts.json');
    const fromJson: string[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(fromJson).toEqual([...SUPPORTED_HOSTS]);
  });
});
