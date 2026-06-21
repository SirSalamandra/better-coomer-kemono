/**
 * @jest-environment node
 */

import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { createDatabaseServices } from "../core/database/createDatabaseServices";
import { DatabaseServices } from "../core/database/contracts";

(global as any).IDBKeyRange = IDBKeyRange;

let db: DatabaseServices;

beforeEach(async () => {
  (global as any).indexedDB = new IDBFactory();
  db = createDatabaseServices();
  await db.lifecycle.init();
});

afterEach(async () => {
  await db.lifecycle.close();
});

describe("Artist operations", () => {
  test("add / get stores and retrieves an artist", async () => {
    await db.artists.add({ id: "artist1", content_origin: "patreon" });
    const artist = await db.artists.get("artist1");
    expect(artist).toEqual({ id: "artist1", content_origin: "patreon" });
  });

  test("get returns undefined for a missing artist", async () => {
    expect(await db.artists.get("nonexistent")).toBeUndefined();
  });

  test("getAll returns all stored artists", async () => {
    await db.artists.add({ id: "a1", content_origin: "patreon" });
    await db.artists.add({ id: "a2", content_origin: "fanbox" });
    const artists = await db.artists.getAll();
    expect(artists).toHaveLength(2);
    expect(artists.map(a => a.id)).toEqual(expect.arrayContaining(["a1", "a2"]));
  });

  test("getAll returns empty array when no artists exist", async () => {
    expect(await db.artists.getAll()).toEqual([]);
  });

  test("update overwrites an existing artist", async () => {
    await db.artists.add({ id: "a1", content_origin: "patreon" });
    await db.artists.update({ id: "a1", content_origin: "fanbox", name: "Updated Name" });
    const artist = await db.artists.get("a1");
    expect(artist?.content_origin).toBe("fanbox");
    expect(artist?.name).toBe("Updated Name");
  });

  test("deleteArtistCascade removes artist record", async () => {
    await db.artists.add({ id: "a1", content_origin: "patreon" });
    await db.tracking.deleteArtistCascade("a1");
    expect(await db.artists.get("a1")).toBeUndefined();
  });

  test("deleteArtistCascade also removes all posts belonging to artist", async () => {
    await db.artists.add({ id: "a1", content_origin: "patreon" });
    await db.posts.add({ id: "p1", artist_id: "a1", viewed_at: "2024-01-01" });
    await db.posts.add({ id: "p2", artist_id: "a1", viewed_at: "2024-01-02" });

    await db.tracking.deleteArtistCascade("a1");

    expect(await db.posts.getAll()).toHaveLength(0);
  });

  test("deleteArtistCascade only removes posts for deleted artist", async () => {
    await db.artists.add({ id: "a1", content_origin: "patreon" });
    await db.artists.add({ id: "a2", content_origin: "fanbox" });
    await db.posts.add({ id: "p1", artist_id: "a1", viewed_at: "2024-01-01" });
    await db.posts.add({ id: "p2", artist_id: "a2", viewed_at: "2024-01-02" });

    await db.tracking.deleteArtistCascade("a1");

    const remaining = await db.posts.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("p2");
  });
});

describe("Post operations", () => {
  test("add / get stores and retrieves a post", async () => {
    await db.posts.add({ id: "p1", artist_id: "a1", viewed_at: "2024-01-01" });
    const post = await db.posts.get("p1");
    expect(post).toEqual({ id: "p1", artist_id: "a1", viewed_at: "2024-01-01" });
  });

  test("get returns undefined for a missing post", async () => {
    expect(await db.posts.get("nonexistent")).toBeUndefined();
  });

  test("getAll returns all stored posts", async () => {
    await db.posts.add({ id: "p1", artist_id: "a1", viewed_at: "2024-01-01" });
    await db.posts.add({ id: "p2", artist_id: "a2", viewed_at: "2024-01-02" });
    expect(await db.posts.getAll()).toHaveLength(2);
  });

  test("getAll returns empty array when no posts exist", async () => {
    expect(await db.posts.getAll()).toEqual([]);
  });

  test("getByArtist returns only that artist's posts", async () => {
    await db.posts.add({ id: "p1", artist_id: "a1", viewed_at: "2024-01-01" });
    await db.posts.add({ id: "p2", artist_id: "a1", viewed_at: "2024-01-02" });
    await db.posts.add({ id: "p3", artist_id: "a2", viewed_at: "2024-01-03" });

    const posts = await db.posts.getByArtist("a1");
    expect(posts).toHaveLength(2);
    expect(posts.map(p => p.id)).toEqual(expect.arrayContaining(["p1", "p2"]));
  });

  test("getByArtist returns empty array for unknown artist", async () => {
    expect(await db.posts.getByArtist("unknown")).toEqual([]);
  });

  test("update overwrites an existing post", async () => {
    await db.posts.add({ id: "p1", artist_id: "a1", viewed_at: "2024-01-01" });
    await db.posts.update({ id: "p1", artist_id: "a1", viewed_at: "2024-06-15", name: "Renamed" });
    const post = await db.posts.get("p1");
    expect(post?.viewed_at).toBe("2024-06-15");
    expect(post?.name).toBe("Renamed");
  });

  test("delete removes post", async () => {
    await db.posts.add({ id: "p1", artist_id: "a1", viewed_at: "2024-01-01" });
    await db.posts.delete("p1");
    expect(await db.posts.get("p1")).toBeUndefined();
  });

  test("delete leaves other posts intact", async () => {
    await db.posts.add({ id: "p1", artist_id: "a1", viewed_at: "2024-01-01" });
    await db.posts.add({ id: "p2", artist_id: "a1", viewed_at: "2024-01-02" });
    await db.posts.delete("p1");
    expect(await db.posts.get("p2")).toBeDefined();
  });
});

describe("Tracking queries", () => {
  test("getArtistWithPosts returns artist and posts", async () => {
    await db.artists.add({ id: "a1", content_origin: "patreon" });
    await db.posts.add({ id: "p1", artist_id: "a1", viewed_at: "2024-01-01" });
    await db.posts.add({ id: "p2", artist_id: "a1", viewed_at: "2024-01-02" });

    const result = await db.tracking.getArtistWithPosts("a1");

    expect(result).not.toBeNull();
    expect(result?.artist.id).toBe("a1");
    expect(result?.posts).toHaveLength(2);
  });

  test("getArtistWithPosts returns null when artist does not exist", async () => {
    expect(await db.tracking.getArtistWithPosts("nonexistent")).toBeNull();
  });

  test("getArtistWithPosts returns empty posts when artist has none", async () => {
    await db.artists.add({ id: "a1", content_origin: "patreon" });
    const result = await db.tracking.getArtistWithPosts("a1");
    expect(result?.posts).toEqual([]);
  });
});

describe("Error handling", () => {
  test("throws when repository access happens before init()", async () => {
    const uninitializedDb = createDatabaseServices();
    await expect(uninitializedDb.artists.get("test")).rejects.toThrow(
      "Database not initialized"
    );
  });
});

describe("Version helpers", () => {
  test("getTargetVersion returns latest migration version (3)", () => {
    expect(db.version.getTargetVersion()).toBe(3);
  });

  test("getStoredVersion returns version of existing database", async () => {
    const version = await db.version.getStoredVersion();
    expect(version).toBe(db.version.getTargetVersion());
  });

  test("getStoredVersion returns 0 when database does not exist", async () => {
    (global as any).indexedDB = new IDBFactory();
    const fresh = createDatabaseServices();
    const version = await fresh.version.getStoredVersion();
    expect(version).toBe(0);
  });
});

describe("exportAllData", () => {
  test("returns empty arrays when DB is empty", async () => {
    const result = await db.backup.exportAllData();
    expect(result.artists).toEqual([]);
    expect(result.posts).toEqual([]);
  });

  test("exports all artists and posts", async () => {
    await db.artists.add({ id: "a1", content_origin: "patreon", name: "Artist One" });
    await db.posts.add({ id: "p1", artist_id: "a1", viewed_at: "2024-01-01" });
    await db.posts.add({ id: "p2", artist_id: "a1", viewed_at: "2024-01-02" });

    const { artists, posts } = await db.backup.exportAllData();

    expect(artists).toHaveLength(1);
    expect(artists[0].id).toBe("a1");
    expect(posts).toHaveLength(2);
    expect(posts.map(p => p.id)).toEqual(expect.arrayContaining(["p1", "p2"]));
  });
});

describe("importData", () => {
  test("inserts new artists and posts into empty DB", async () => {
    const backup = {
      artists: [{ id: "a1", content_origin: "fanbox", name: "Imported Artist" }],
      posts: [{ id: "p1", artist_id: "a1", viewed_at: "2024-03-01" }],
    };

    await db.backup.importData(backup);

    expect(await db.artists.get("a1")).toMatchObject({ id: "a1", name: "Imported Artist" });
    expect(await db.posts.get("p1")).toMatchObject({ id: "p1", artist_id: "a1" });
  });

  test("upserts existing records without duplicates", async () => {
    await db.artists.add({ id: "a1", content_origin: "patreon" });

    await db.backup.importData({
      artists: [{ id: "a1", content_origin: "patreon", name: "Updated Name" }],
      posts: [],
    });

    const all = await db.artists.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Updated Name");
  });

  test("imports multiple artists and posts in one call", async () => {
    const backup = {
      artists: [
        { id: "a1", content_origin: "patreon" },
        { id: "a2", content_origin: "fanbox" },
      ],
      posts: [
        { id: "p1", artist_id: "a1", viewed_at: "2024-01-01" },
        { id: "p2", artist_id: "a2", viewed_at: "2024-02-01" },
        { id: "p3", artist_id: "a1", viewed_at: "2024-03-01" },
      ],
    };

    await db.backup.importData(backup);

    expect(await db.artists.getAll()).toHaveLength(2);
    expect(await db.posts.getAll()).toHaveLength(3);
  });
});

describe("reset", () => {
  test("wipes all data and reinitializes database", async () => {
    await db.artists.add({ id: "a1", content_origin: "patreon" });
    await db.posts.add({ id: "p1", artist_id: "a1", viewed_at: "2024-01-01" });

    await db.backup.reset();

    expect(await db.artists.getAll()).toEqual([]);
    expect(await db.posts.getAll()).toEqual([]);
  });

  test("database remains functional after reset", async () => {
    await db.backup.reset();
    await db.artists.add({ id: "a2", content_origin: "fanbox" });
    expect(await db.artists.get("a2")).toMatchObject({ id: "a2" });
  });
});
