import { SUPPORTED_HOSTS } from '../shared/constants/supportedHosts';

/**
 * Runtime host guard based on the Host Support Policy.
 *
 * Uses exact, normalised hostname matching against the canonical allowlist in
 * supportedHosts.ts.  Port stripping and lowercasing are applied before
 * comparison; no heuristic or TLD-flexible matching is performed.
 *
 * Hosts outside the allowlist must be treated as a safe no-op by all callers.
 */
export const Configurations = {
  /**
   * Check a full hostname (optionally with port) against the Host Support
   * Policy allowlist.  Returns true only when the normalised hostname exactly
   * matches one of the Supported Hosts.
   */
  isHostAllowed(host: string): boolean {
    if (!host) return false;
    const hostname = host.split(':')[0].toLowerCase();
    return SUPPORTED_HOSTS.includes(hostname);
  }
};
