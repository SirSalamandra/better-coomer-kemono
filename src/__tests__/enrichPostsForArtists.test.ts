import { enrichPostsForArtists } from "../ui/management/utils/enrich";
import { IndexedDbManager } from "../core/database/indexedDbManager";
import { Artist } from "../shared/types/Artist";
import { Post } from "../shared/types/Post";

const artist: Artist = { id: "a1", content_origin: "patreon", hostname: "kemono.cr", name: "Test Artist" };
const unenrichedPost: Post = { id: "p1", artist_id: "a1", viewed_at: "2026-01-01T00:00:00.000Z" };
const enrichedPost: Post = { ...unenrichedPost, last_enriched_at: "2026-01-01T00:00:00.000Z" };

describe("enrichPostsForArtists", () => {
  let db: IndexedDbManager;
  let loadData: jest.Mock;
  let render: jest.Mock;

  beforeEach(() => {
    db = {
      updatePost: jest.fn().mockResolvedValue(undefined),
    } as unknown as IndexedDbManager;
    loadData = jest.fn().mockResolvedValue(undefined);
    render = jest.fn();
    global.fetch = jest.fn();
  });

  test("does not call render when all API requests fail", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

    await enrichPostsForArtists(db, [unenrichedPost], [artist], loadData, render);

    expect(render).not.toHaveBeenCalled();
    expect(loadData).not.toHaveBeenCalled();
  });

  test("does not call render when fetch rejects", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    await enrichPostsForArtists(db, [unenrichedPost], [artist], loadData, render);

    expect(render).not.toHaveBeenCalled();
    expect(loadData).not.toHaveBeenCalled();
  });

  test("calls render and loadData when at least one post is enriched successfully", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        post: { title: "My Post", published: "2026-01-01" },
        attachments: [],
      }),
    });

    await enrichPostsForArtists(db, [unenrichedPost], [artist], loadData, render);

    expect(loadData).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
    expect(db.updatePost).toHaveBeenCalledTimes(1);
  });

  test("skips posts that already have last_enriched_at", async () => {
    await enrichPostsForArtists(db, [enrichedPost], [artist], loadData, render);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });
});
