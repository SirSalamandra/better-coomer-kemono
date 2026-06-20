/**
 * @jest-environment node
 */

import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { IndexedDbManager } from '../core/database/indexedDbManager';

// Make IDBKeyRange available globally — it's stateless so one-time setup is fine.
(global as any).IDBKeyRange = IDBKeyRange;

let db: IndexedDbManager;

beforeEach(async () => {
  // Each test gets a completely fresh in-memory database.
  (global as any).indexedDB = new IDBFactory();

  // Use createInstance() so tests don't need to reset private singleton state.
  db = IndexedDbManager.createInstance();
  await db.init();
});

afterEach(async () => {
  await db.close();
});

// ---------------------------------------------------------------------------
// Artist operations
// ---------------------------------------------------------------------------

describe('Artist operations', () => {
  test('addArtist / getArtist — stores and retrieves an artist', async () => {
    await db.addArtist({ id: 'artist1', content_origin: 'patreon' });
    const artist = await db.getArtist('artist1');
    expect(artist).toEqual({ id: 'artist1', content_origin: 'patreon' });
  });

  test('getArtist — returns undefined for a missing artist', async () => {
    expect(await db.getArtist('nonexistent')).toBeUndefined();
  });

  test('getAllArtists — returns all stored artists', async () => {
    await db.addArtist({ id: 'a1', content_origin: 'patreon' });
    await db.addArtist({ id: 'a2', content_origin: 'fanbox' });
    const artists = await db.getAllArtists();
    expect(artists).toHaveLength(2);
    expect(artists.map(a => a.id)).toEqual(expect.arrayContaining(['a1', 'a2']));
  });

  test('getAllArtists — returns empty array when no artists exist', async () => {
    expect(await db.getAllArtists()).toEqual([]);
  });

  test('updateArtist — overwrites an existing artist', async () => {
    await db.addArtist({ id: 'a1', content_origin: 'patreon' });
    await db.updateArtist({ id: 'a1', content_origin: 'fanbox', name: 'Updated Name' });
    const artist = await db.getArtist('a1');
    expect(artist?.content_origin).toBe('fanbox');
    expect(artist?.name).toBe('Updated Name');
  });

  test('deleteArtist — removes the artist record', async () => {
    await db.addArtist({ id: 'a1', content_origin: 'patreon' });
    await db.deleteArtist('a1');
    expect(await db.getArtist('a1')).toBeUndefined();
  });

  test('deleteArtist — also removes all posts belonging to that artist', async () => {
    await db.addArtist({ id: 'a1', content_origin: 'patreon' });
    await db.addPost({ id: 'p1', artist_id: 'a1', viewed_at: '2024-01-01' });
    await db.addPost({ id: 'p2', artist_id: 'a1', viewed_at: '2024-01-02' });

    await db.deleteArtist('a1');

    expect(await db.getAllPosts()).toHaveLength(0);
  });

  test('deleteArtist — only removes posts for the deleted artist', async () => {
    await db.addArtist({ id: 'a1', content_origin: 'patreon' });
    await db.addArtist({ id: 'a2', content_origin: 'fanbox' });
    await db.addPost({ id: 'p1', artist_id: 'a1', viewed_at: '2024-01-01' });
    await db.addPost({ id: 'p2', artist_id: 'a2', viewed_at: '2024-01-02' });

    await db.deleteArtist('a1');

    const remaining = await db.getAllPosts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('p2');
  });
});

// ---------------------------------------------------------------------------
// Post operations
// ---------------------------------------------------------------------------

describe('Post operations', () => {
  test('addPost / getPost — stores and retrieves a post', async () => {
    await db.addPost({ id: 'p1', artist_id: 'a1', viewed_at: '2024-01-01' });
    const post = await db.getPost('p1');
    expect(post).toEqual({ id: 'p1', artist_id: 'a1', viewed_at: '2024-01-01' });
  });

  test('getPost — returns undefined for a missing post', async () => {
    expect(await db.getPost('nonexistent')).toBeUndefined();
  });

  test('getAllPosts — returns all stored posts', async () => {
    await db.addPost({ id: 'p1', artist_id: 'a1', viewed_at: '2024-01-01' });
    await db.addPost({ id: 'p2', artist_id: 'a2', viewed_at: '2024-01-02' });
    expect(await db.getAllPosts()).toHaveLength(2);
  });

  test('getAllPosts — returns empty array when no posts exist', async () => {
    expect(await db.getAllPosts()).toEqual([]);
  });

  test('getPostsByArtist — returns only that artist\'s posts', async () => {
    await db.addPost({ id: 'p1', artist_id: 'a1', viewed_at: '2024-01-01' });
    await db.addPost({ id: 'p2', artist_id: 'a1', viewed_at: '2024-01-02' });
    await db.addPost({ id: 'p3', artist_id: 'a2', viewed_at: '2024-01-03' });

    const posts = await db.getPostsByArtist('a1');
    expect(posts).toHaveLength(2);
    expect(posts.map(p => p.id)).toEqual(expect.arrayContaining(['p1', 'p2']));
  });

  test('getPostsByArtist — returns empty array for unknown artist', async () => {
    expect(await db.getPostsByArtist('unknown')).toEqual([]);
  });

  test('updatePost — overwrites an existing post', async () => {
    await db.addPost({ id: 'p1', artist_id: 'a1', viewed_at: '2024-01-01' });
    await db.updatePost({ id: 'p1', artist_id: 'a1', viewed_at: '2024-06-15', name: 'Renamed' });
    const post = await db.getPost('p1');
    expect(post?.viewed_at).toBe('2024-06-15');
    expect(post?.name).toBe('Renamed');
  });

  test('deletePost — removes the post', async () => {
    await db.addPost({ id: 'p1', artist_id: 'a1', viewed_at: '2024-01-01' });
    await db.deletePost('p1');
    expect(await db.getPost('p1')).toBeUndefined();
  });

  test('deletePost — leaves other posts intact', async () => {
    await db.addPost({ id: 'p1', artist_id: 'a1', viewed_at: '2024-01-01' });
    await db.addPost({ id: 'p2', artist_id: 'a1', viewed_at: '2024-01-02' });
    await db.deletePost('p1');
    expect(await db.getPost('p2')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Combined operations
// ---------------------------------------------------------------------------

describe('getArtistWithPosts', () => {
  test('returns artist and their posts', async () => {
    await db.addArtist({ id: 'a1', content_origin: 'patreon' });
    await db.addPost({ id: 'p1', artist_id: 'a1', viewed_at: '2024-01-01' });
    await db.addPost({ id: 'p2', artist_id: 'a1', viewed_at: '2024-01-02' });

    const result = await db.getArtistWithPosts('a1');

    expect(result).not.toBeNull();
    expect(result?.artist.id).toBe('a1');
    expect(result?.posts).toHaveLength(2);
  });

  test('returns null when the artist does not exist', async () => {
    expect(await db.getArtistWithPosts('nonexistent')).toBeNull();
  });

  test('returns artist with empty posts array when artist has no posts', async () => {
    await db.addArtist({ id: 'a1', content_origin: 'patreon' });
    const result = await db.getArtistWithPosts('a1');
    expect(result?.posts).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('Error handling', () => {
  test('throws when any operation is attempted before init()', async () => {
    const uninitializedDb = IndexedDbManager.createInstance();
    // Do NOT call init() — getDb() should throw immediately
    await expect(uninitializedDb.getArtist('test')).rejects.toThrow(
      'Database not initialized'
    );
  });
});

// ---------------------------------------------------------------------------
// Version helpers
// ---------------------------------------------------------------------------

describe('getTargetVersion', () => {
  test('returns the latest migration version (3)', () => {
    expect(db.getTargetVersion()).toBe(3);
  });
});

describe('getStoredVersion', () => {
  test('returns the version of an already-opened database', async () => {
    // db was opened (and migrated) in beforeEach; stored version should equal target
    const version = await db.getStoredVersion();
    expect(version).toBe(db.getTargetVersion());
  });

  test('returns 0 when the database does not exist', async () => {
    // Use a fresh IDBFactory so the DB has never been created
    (global as any).indexedDB = new IDBFactory();
    const fresh = IndexedDbManager.createInstance();
    // Do NOT call init()
    const version = await fresh.getStoredVersion();
    expect(version).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// exportAllData / importData
// ---------------------------------------------------------------------------

describe('exportAllData', () => {
  test('returns empty arrays when the DB is empty', async () => {
    const result = await db.exportAllData();
    expect(result.artists).toEqual([]);
    expect(result.posts).toEqual([]);
  });

  test('exports all artists and posts', async () => {
    await db.addArtist({ id: 'a1', content_origin: 'patreon', name: 'Artist One' });
    await db.addPost({ id: 'p1', artist_id: 'a1', viewed_at: '2024-01-01' });
    await db.addPost({ id: 'p2', artist_id: 'a1', viewed_at: '2024-01-02' });

    const { artists, posts } = await db.exportAllData();

    expect(artists).toHaveLength(1);
    expect(artists[0].id).toBe('a1');
    expect(posts).toHaveLength(2);
    expect(posts.map(p => p.id)).toEqual(expect.arrayContaining(['p1', 'p2']));
  });
});

describe('importData', () => {
  test('inserts new artists and posts into an empty DB', async () => {
    const backup = {
      artists: [{ id: 'a1', content_origin: 'fanbox', name: 'Imported Artist' }],
      posts:   [{ id: 'p1', artist_id: 'a1', viewed_at: '2024-03-01' }],
    };

    await db.importData(backup);

    expect(await db.getArtist('a1')).toMatchObject({ id: 'a1', name: 'Imported Artist' });
    expect(await db.getPost('p1')).toMatchObject({ id: 'p1', artist_id: 'a1' });
  });

  test('upserts (overwrites) existing records without duplicates', async () => {
    await db.addArtist({ id: 'a1', content_origin: 'patreon' });

    await db.importData({
      artists: [{ id: 'a1', content_origin: 'patreon', name: 'Updated Name' }],
      posts: [],
    });

    const all = await db.getAllArtists();
    expect(all).toHaveLength(1);           // no duplicate
    expect(all[0].name).toBe('Updated Name');
  });

  test('imports multiple artists and posts in one call', async () => {
    const backup = {
      artists: [
        { id: 'a1', content_origin: 'patreon' },
        { id: 'a2', content_origin: 'fanbox' },
      ],
      posts: [
        { id: 'p1', artist_id: 'a1', viewed_at: '2024-01-01' },
        { id: 'p2', artist_id: 'a2', viewed_at: '2024-02-01' },
        { id: 'p3', artist_id: 'a1', viewed_at: '2024-03-01' },
      ],
    };

    await db.importData(backup);

    expect(await db.getAllArtists()).toHaveLength(2);
    expect(await db.getAllPosts()).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe('reset', () => {
  test('wipes all data and reinitialises the database', async () => {
    await db.addArtist({ id: 'a1', content_origin: 'patreon' });
    await db.addPost({ id: 'p1', artist_id: 'a1', viewed_at: '2024-01-01' });

    await db.reset();

    expect(await db.getAllArtists()).toEqual([]);
    expect(await db.getAllPosts()).toEqual([]);
  });

  test('DB is fully functional after reset (can add and retrieve records)', async () => {
    await db.reset();
    await db.addArtist({ id: 'a2', content_origin: 'fanbox' });
    expect(await db.getArtist('a2')).toMatchObject({ id: 'a2' });
  });
});
