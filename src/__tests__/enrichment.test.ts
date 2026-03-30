import { transformArtistProfile, transformPostProfile } from "../core/utils/enrichment";
import { Artist } from "../shared/types/Artist";
import { Post } from "../shared/types/Post";

// Mock GetDate to have a consistent value in tests
jest.mock("../shared/utils/date", () => ({
  GetDate: () => "2026-03-29T12:00:00.000Z"
}));

describe("Enrichment Transformation Utils", () => {
  
  describe("transformArtistProfile", () => {
    const existingArtist: Artist = {
      id: "a1",
      content_origin: "fansly"
    };

    test("provides fallbacks for empty API name", () => {
      const apiData = { name: "" };
      const result = transformArtistProfile(existingArtist, apiData as any, "coomer.st");
      
      expect(result.name).toBe("Unknown Artist");
      expect(result.last_enriched_at).toBe("2026-03-29T12:00:00.000Z");
    });

    test("provides fallbacks for null/undefined API name", () => {
      const apiData = { name: undefined };
      const result = transformArtistProfile(existingArtist, apiData as any, "coomer.st");
      
      expect(result.name).toBe("Unknown Artist");
    });

    test("preserves existing name if API name is empty", () => {
      const artistWithName: Artist = { ...existingArtist, name: "Existing Name" };
      const apiData = { name: "" };
      const result = transformArtistProfile(artistWithName, apiData as any, "coomer.st");
      
      expect(result.name).toBe("Existing Name");
    });

    test("provides fallback for missing updated_at", () => {
      const apiData = { updated: "" };
      const result = transformArtistProfile(existingArtist, apiData as any, "coomer.st");
      
      expect(result.updated_at).toBe("—");
    });

    test("correctly constructs thumbnail and banner URLs", () => {
      const apiData = { id: "a1", service: "fansly" };
      const result = transformArtistProfile(existingArtist, apiData as any, "coomer.st");
      
      expect(result.thumbnail_url).toBe("https://img.coomer.st/icons/fansly/a1");
      expect(result.banner_url).toBe("https://img.coomer.st/banners/fansly/a1");
    });
  });

  describe("transformPostProfile", () => {
    const existingPost: Post = {
      id: "p1",
      artist_id: "a1",
      viewed_at: "2026-03-29T10:00:00.000Z"
    };

    test("provides fallback for empty API title", () => {
      const apiPost = { title: "" };
      const result = transformPostProfile(existingPost, apiPost, []);
      
      expect(result.name).toBe("Untitled");
      expect(result.last_enriched_at).toBe("2026-03-29T12:00:00.000Z");
    });

    test("preserves existing name if API title is empty", () => {
      const postWithName: Post = { ...existingPost, name: "Original Title" };
      const apiPost = { title: "" };
      const result = transformPostProfile(postWithName, apiPost, []);
      
      expect(result.name).toBe("Original Title");
    });

    test("provides fallback for missing published date", () => {
      const apiPost = { published: "" };
      const result = transformPostProfile(existingPost, apiPost, []);
      
      expect(result.posted_at).toBe("—");
    });

    test("handles null/missing attachments array", () => {
      const apiPost = { title: "Test Post" };
      const result = transformPostProfile(existingPost, apiPost, null);
      
      expect(result.attachment_count).toBe(0);
    });

    test("calculates attachment count correctly", () => {
      const apiPost = { title: "Test Post" };
      const attachments = [{ path: '/a', name: 'a' }, { path: '/b', name: 'b' }, { path: '/c', name: 'c' }];
      const result = transformPostProfile(existingPost, apiPost, attachments);
      
      expect(result.attachment_count).toBe(3);
    });
  });
});
