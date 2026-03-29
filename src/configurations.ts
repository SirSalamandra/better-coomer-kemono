export const Configurations = {
  /**
   * Only the *base* names need to be configured here.  For example, the
   * domains `coomer.cr`, `coomer.st`, `coomer.xyz` will all be accepted if
   * the list contains "coomer".  This avoids having to update the config
   * every time the site switches TLDs.
   */
  hostBaseNames: ["kemono", "coomer"],

  /**
   * Check a full hostname to see if it matches one of the configured bases.
   * The comparison ignores ports and is case‑insensitive.
   */
  isHostAllowed(host: string): boolean {
    const hostname = host.split(':')[0].toLowerCase();
    return this.hostBaseNames.some(base =>
      hostname === base || hostname.startsWith(base + '.')
    );
  }
}