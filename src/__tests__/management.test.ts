/**
 * Tests for the pure helper functions re-exported from management.ts,
 * and for the createManagementApp composition root.
 *
 * We import the helpers directly from their source modules so that
 * management.ts's module-level entrypoint call is never executed,
 * removing the need for jest.mock('../core/database/indexedDbManager').
 */

import { Artist } from '../shared/types/Artist';
import { Post }   from '../shared/types/Post';
import { hostForArtist } from '../core/hosts/HostResolver';

// Import pure helpers directly — no DB side-effects
import { formatDate, lastViewedFromPosts } from '../ui/management/utils/format';

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe('formatDate', () => {
  test('returns "—" for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  test('returns "—" for an invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  test('returns "—" for an empty string', () => {
    expect(formatDate('')).toBe('—');
  });

  test('returns a non-empty string for a valid ISO date', () => {
    const result = formatDate('2024-03-15T10:00:00Z');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('—');
    // Should include the year
    expect(result).toContain('2024');
  });

  test('returns a non-empty string for a valid ISO datetime string', () => {
    // Use noon UTC to avoid date shifting across timezones
    const result = formatDate('2025-06-15T12:00:00.000Z');
    expect(result).not.toBe('—');
    expect(result).toContain('2025');
  });
});

// ---------------------------------------------------------------------------
// lastViewedFromPosts
// ---------------------------------------------------------------------------

describe('lastViewedFromPosts', () => {
  test('returns "—" for an empty posts array', () => {
    expect(lastViewedFromPosts([])).toBe('—');
  });

  test('returns the formatted date of the single post', () => {
    const posts: Post[] = [{ id: 'p1', viewed_at: '2024-06-01', artist_id: 'a1' }];
    const result = lastViewedFromPosts(posts);
    expect(result).not.toBe('—');
    expect(result).toContain('2024');
  });

  test('returns the most recent viewed_at among multiple posts', () => {
    const posts: Post[] = [
      { id: 'p1', viewed_at: '2024-01-01', artist_id: 'a1' },
      { id: 'p2', viewed_at: '2024-12-31', artist_id: 'a1' },
      { id: 'p3', viewed_at: '2024-06-15', artist_id: 'a1' },
    ];
    const result = lastViewedFromPosts(posts);
    // The latest date is 2024-12-31
    expect(result).toContain('2024');
    // Should NOT be the earliest
    const earliest = formatDate('2024-01-01');
    expect(result).not.toBe(earliest);
    // Should match the latest
    const latest = formatDate('2024-12-31');
    expect(result).toBe(latest);
  });

  test('handles posts with the same viewed_at without throwing', () => {
    const posts: Post[] = [
      { id: 'p1', viewed_at: '2024-05-05', artist_id: 'a1' },
      { id: 'p2', viewed_at: '2024-05-05', artist_id: 'a1' },
    ];
    expect(() => lastViewedFromPosts(posts)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// hostForArtist
// ---------------------------------------------------------------------------

describe('hostForArtist', () => {
  // When hostname is present it takes precedence
  test('returns "coomer.st" when hostname contains "coomer"', () => {
    const artist: Artist = { id: 'a1', content_origin: 'patreon', hostname: 'coomer.st' };
    expect(hostForArtist(artist)).toBe('coomer.st');
  });

  test('returns "kemono.cr" when hostname contains "kemono"', () => {
    const artist: Artist = { id: 'a1', content_origin: 'onlyfans', hostname: 'kemono.cr' };
    expect(hostForArtist(artist)).toBe('kemono.cr');
  });

  // When hostname is absent, fall back to content_origin lookup
  test('returns "coomer.st" for onlyfans without hostname', () => {
    const artist: Artist = { id: 'a1', content_origin: 'onlyfans' };
    expect(hostForArtist(artist)).toBe('coomer.st');
  });

  test('returns "coomer.st" for fansly without hostname', () => {
    const artist: Artist = { id: 'a1', content_origin: 'fansly' };
    expect(hostForArtist(artist)).toBe('coomer.st');
  });

  test('returns "coomer.st" for candfans without hostname', () => {
    const artist: Artist = { id: 'a1', content_origin: 'candfans' };
    expect(hostForArtist(artist)).toBe('coomer.st');
  });

  test('returns "kemono.cr" for patreon without hostname', () => {
    const artist: Artist = { id: 'a1', content_origin: 'patreon' };
    expect(hostForArtist(artist)).toBe('kemono.cr');
  });

  test('returns "kemono.cr" for fanbox without hostname', () => {
    const artist: Artist = { id: 'a1', content_origin: 'fanbox' };
    expect(hostForArtist(artist)).toBe('kemono.cr');
  });

  test('content_origin lookup is case-insensitive', () => {
    const artist: Artist = { id: 'a1', content_origin: 'OnlyFans' };
    expect(hostForArtist(artist)).toBe('coomer.st');
  });

  test('returns "kemono.cr" for an unknown content_origin without hostname', () => {
    const artist: Artist = { id: 'a1', content_origin: 'unknown-service' };
    expect(hostForArtist(artist)).toBe('kemono.cr');
  });
});
