import { Configurations } from '../core/config';

describe('Configurations.isHostAllowed — Host Support Policy (exact match)', () => {
  test.each([
    // Supported hosts (exact)
    ['kemono.cr', true],
    ['coomer.st', true],
    // Case-insensitive
    ['KEMONO.CR', true],
    ['Coomer.St', true],
    // Port is stripped before matching
    ['kemono.cr:8080', true],
    ['coomer.st:443', true],
    // Unsupported: other TLDs for the same base name (allowlist is explicit)
    ['kemono.st', false],
    ['kemono.su', false],
    ['coomer.cr', false],
    // Unsupported: bare base name without TLD
    ['kemono', false],
    ['coomer', false],
    // Unsupported: unrelated hosts
    ['example.com', false],
    ['google.com', false],
    // Unsupported: base name embedded in a different hostname
    ['notkemono.cr', false],
    ['evil-coomer.com', false],
    ['mykemono.st', false],
    // Unsupported: empty string
    ['', false],
  ])('isHostAllowed("%s") → %s', (host, expected) => {
    expect(Configurations.isHostAllowed(host)).toBe(expected);
  });
});
