/**
 * Host Support Policy — canonical allowlist of supported hostnames.
 *
 * The list itself lives in `supportedHosts.json` (the single source of truth).
 * This module re-exports it with the correct readonly type for use in TypeScript.
 *
 * Runtime: Configurations.isHostAllowed() in src/core/config.ts reads from
 * this constant and performs exact, normalised hostname matching.
 *
 * Build:   scripts/build.js requires the same JSON file directly to derive
 * manifest URL patterns without needing TypeScript transpilation.
 */
import hostsJson from './supportedHosts.json';

export const SUPPORTED_HOSTS: readonly string[] = hostsJson;
