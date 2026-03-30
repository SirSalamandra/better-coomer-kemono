import { Configurations } from '../core/config';

describe('Configurations.isHostAllowed', () => {
  test.each([
    // Allowed: known base names with any TLD
    ['kemono.cr', true],
    ['kemono.st', true],
    ['kemono.su', true],
    ['coomer.cr', true],
    ['coomer.st', true],
    // Allowed: exact base name (no TLD)
    ['kemono', true],
    ['coomer', true],
    // Allowed: host with port — port is stripped before matching
    ['kemono.cr:8080', true],
    ['coomer.st:443', true],
    // Allowed: case-insensitive
    ['KEMONO.CR', true],
    ['Coomer.St', true],
    // Blocked: unrelated host
    ['example.com', false],
    ['google.com', false],
    // Blocked: base name embedded in a different hostname (must start with base + '.')
    ['notkemono.cr', false],
    ['evil-coomer.com', false],
    ['mykemono.st', false],
    // Blocked: empty string
    ['', false],
  ])('isHostAllowed("%s") → %s', (host, expected) => {
    expect(Configurations.isHostAllowed(host)).toBe(expected);
  });
});
