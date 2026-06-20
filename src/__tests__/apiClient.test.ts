/**
 * Tests for src/core/services/apiClient.ts
 */

import {
  buildArtistProfileUrl,
  buildPostUrl,
  fetchArtistProfile,
  fetchPostDetails,
} from "../core/services/apiClient";

beforeEach(() => {
  global.fetch = jest.fn();
});

// ── URL builders ──────────────────────────────────────────────────────────────

describe("buildArtistProfileUrl", () => {
  test("constructs correct profile URL", () => {
    expect(buildArtistProfileUrl("kemono.cr", "patreon", "123")).toBe(
      "https://kemono.cr/api/v1/patreon/user/123/profile"
    );
  });
});

describe("buildPostUrl", () => {
  test("constructs correct post URL", () => {
    expect(buildPostUrl("coomer.st", "onlyfans", "a1", "p1")).toBe(
      "https://coomer.st/api/v1/onlyfans/user/a1/post/p1"
    );
  });
});

// ── fetchArtistProfile ────────────────────────────────────────────────────────

describe("fetchArtistProfile", () => {
  test("returns null when response is not ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    const result = await fetchArtistProfile("kemono.cr", "patreon", "123");
    expect(result).toBeNull();
  });

  test("returns parsed JSON when response is ok", async () => {
    const mockData = { id: "123", name: "Test Artist", service: "patreon" };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockData),
    });
    const result = await fetchArtistProfile("kemono.cr", "patreon", "123");
    expect(result).toEqual(mockData);
  });

  test("uses Accept: text/css header", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    await fetchArtistProfile("kemono.cr", "patreon", "123");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      { headers: { Accept: "text/css" } }
    );
  });

  test("throws on network error", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network failure"));
    await expect(fetchArtistProfile("kemono.cr", "patreon", "123")).rejects.toThrow("Network failure");
  });
});

// ── fetchPostDetails ──────────────────────────────────────────────────────────

describe("fetchPostDetails", () => {
  test("returns null when response is not ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    const result = await fetchPostDetails("coomer.st", "onlyfans", "a1", "p1");
    expect(result).toBeNull();
  });

  test("returns parsed JSON when response is ok", async () => {
    const mockData = { post: { id: "p1", title: "Post 1" }, attachments: [] };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockData),
    });
    const result = await fetchPostDetails("coomer.st", "onlyfans", "a1", "p1");
    expect(result).toEqual(mockData);
  });

  test("throws on network error", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("timeout"));
    await expect(fetchPostDetails("coomer.st", "onlyfans", "a1", "p1")).rejects.toThrow("timeout");
  });
});
