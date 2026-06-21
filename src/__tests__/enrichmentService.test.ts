/**
 * Tests for src/core/services/enrichmentService.ts
 */

import { enrichArtistIfNeeded, enrichPostIfNeeded, enrichPosts, enrichArtistSubset } from "../core/services/enrichmentService";
import { EnrichmentStore } from "../core/database/contracts";
import { Artist } from "../shared/types/Artist";
import { Post } from "../shared/types/Post";

// apiClient mock
jest.mock("../core/services/apiClient", () => ({
  fetchArtistProfile: jest.fn(),
  fetchPostDetails: jest.fn(),
}));

import { fetchArtistProfile, fetchPostDetails } from "../core/services/apiClient";

const db: jest.Mocked<EnrichmentStore> = {
  updateArtist: jest.fn().mockResolvedValue(undefined),
  updatePost: jest.fn().mockResolvedValue(undefined),
};

const freshArtist: Artist = {
  id: "a1",
  content_origin: "patreon",
  name: undefined,
  last_enriched_at: undefined,
};

const staleArtist: Artist = {
  id: "a2",
  content_origin: "patreon",
  name: "Old Name",
  last_enriched_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25h ago
};

const recentArtist: Artist = {
  id: "a3",
  content_origin: "patreon",
  name: "Recent Name",
  last_enriched_at: new Date().toISOString(),
};

const unenrichedPost: Post = {
  id: "p1",
  artist_id: "a1",
  viewed_at: "2026-01-01T00:00:00.000Z",
};

const enrichedPost: Post = {
  ...unenrichedPost,
  last_enriched_at: "2026-01-01T00:00:00.000Z",
};

// ── enrichArtistIfNeeded ──────────────────────────────────────────────────────

describe("enrichArtistIfNeeded", () => {
  beforeEach(() => jest.clearAllMocks());

  test("skips artist enriched within 24h with name present", async () => {
    const result = await enrichArtistIfNeeded(db, recentArtist, "kemono.cr");
    expect(result).toBe(false);
    expect(fetchArtistProfile).not.toHaveBeenCalled();
  });

  test("enriches artist with no name", async () => {
    (fetchArtistProfile as jest.Mock).mockResolvedValue({ id: "a1", name: "New Name", service: "patreon" });
    const result = await enrichArtistIfNeeded(db, freshArtist, "kemono.cr");
    expect(result).toBe(true);
    expect(db.updateArtist).toHaveBeenCalled();
  });

  test("enriches stale artist (last_enriched_at > 24h)", async () => {
    (fetchArtistProfile as jest.Mock).mockResolvedValue({ id: "a2", name: "New Name", service: "patreon" });
    const result = await enrichArtistIfNeeded(db, staleArtist, "kemono.cr");
    expect(result).toBe(true);
  });

  test("returns false when API returns null", async () => {
    (fetchArtistProfile as jest.Mock).mockResolvedValue(null);
    const result = await enrichArtistIfNeeded(db, freshArtist, "kemono.cr");
    expect(result).toBe(false);
    expect(db.updateArtist).not.toHaveBeenCalled();
  });

  test("returns false and does not throw when fetch errors", async () => {
    (fetchArtistProfile as jest.Mock).mockRejectedValue(new Error("network error"));
    const result = await enrichArtistIfNeeded(db, freshArtist, "kemono.cr");
    expect(result).toBe(false);
  });
});

// ── enrichPostIfNeeded ────────────────────────────────────────────────────────

describe("enrichPostIfNeeded", () => {
  beforeEach(() => jest.clearAllMocks());

  test("skips already-enriched post", async () => {
    const result = await enrichPostIfNeeded(db, enrichedPost, freshArtist, "kemono.cr");
    expect(result).toBe(false);
    expect(fetchPostDetails).not.toHaveBeenCalled();
  });

  test("enriches unenriched post when API succeeds", async () => {
    (fetchPostDetails as jest.Mock).mockResolvedValue({
      post: { title: "My Post", published: "2026-01-01" },
      attachments: [],
    });
    const result = await enrichPostIfNeeded(db, unenrichedPost, freshArtist, "kemono.cr");
    expect(result).toBe(true);
    expect(db.updatePost).toHaveBeenCalled();
  });

  test("returns false when API returns null", async () => {
    (fetchPostDetails as jest.Mock).mockResolvedValue(null);
    const result = await enrichPostIfNeeded(db, unenrichedPost, freshArtist, "kemono.cr");
    expect(result).toBe(false);
  });

  test("returns false and does not throw on network error", async () => {
    (fetchPostDetails as jest.Mock).mockRejectedValue(new Error("timeout"));
    const result = await enrichPostIfNeeded(db, unenrichedPost, freshArtist, "kemono.cr");
    expect(result).toBe(false);
  });
});

// ── enrichPosts ───────────────────────────────────────────────────────────────

describe("enrichPosts", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns false when all posts are already enriched", async () => {
    const result = await enrichPosts(db, [enrichedPost], [freshArtist]);
    expect(result).toBe(false);
    expect(fetchPostDetails).not.toHaveBeenCalled();
  });

  test("returns true when at least one post is enriched", async () => {
    (fetchPostDetails as jest.Mock).mockResolvedValue({
      post: { title: "Title", published: "2026-01-01" },
      attachments: [],
    });
    const result = await enrichPosts(db, [unenrichedPost], [freshArtist]);
    expect(result).toBe(true);
  });

  test("returns false when API fails for all posts", async () => {
    (fetchPostDetails as jest.Mock).mockResolvedValue(null);
    const result = await enrichPosts(db, [unenrichedPost], [freshArtist]);
    expect(result).toBe(false);
  });

  test("skips posts with no matching artist", async () => {
    const orphanPost: Post = { id: "px", artist_id: "unknown", viewed_at: "2026-01-01" };
    const result = await enrichPosts(db, [orphanPost], [freshArtist]);
    expect(result).toBe(false);
    expect(fetchPostDetails).not.toHaveBeenCalled();
  });
});

// ── enrichArtistSubset ────────────────────────────────────────────────────────

describe("enrichArtistSubset", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns false when all artists already have name and banner", async () => {
    const complete: Artist = { id: "a4", content_origin: "patreon", name: "Named", banner_url: "https://img.kemono.cr/banners/patreon/a4" };
    const result = await enrichArtistSubset(db, [complete]);
    expect(result).toBe(false);
    expect(fetchArtistProfile).not.toHaveBeenCalled();
  });

  test("enriches artists missing name", async () => {
    (fetchArtistProfile as jest.Mock).mockResolvedValue({ id: "a1", name: "New Name", service: "patreon" });
    const result = await enrichArtistSubset(db, [freshArtist]);
    expect(result).toBe(true);
  });
});
