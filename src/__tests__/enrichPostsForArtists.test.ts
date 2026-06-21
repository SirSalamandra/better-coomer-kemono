import { enrichPostsForArtists } from "../ui/management/utils/enrich";
import { EnrichmentStore } from "../core/database/contracts";
import { EnrichmentPipeline } from "../core/services/enrichmentPipeline";
import { Artist } from "../shared/types/Artist";
import { Post } from "../shared/types/Post";

jest.mock("../core/services/enrichmentPipeline");

const artist: Artist = { id: "a1", content_origin: "patreon", hostname: "kemono.cr", name: "Test Artist" };
const unenrichedPost: Post = { id: "p1", artist_id: "a1", viewed_at: "2026-01-01T00:00:00.000Z" };
const enrichedPost: Post = { ...unenrichedPost, last_enriched_at: "2026-01-01T00:00:00.000Z" };

describe("enrichPostsForArtists", () => {
  let db: EnrichmentStore;
  let loadData: jest.Mock;
  let render: jest.Mock;

  beforeEach(() => {
    db = {
      updateArtist: jest.fn().mockResolvedValue(undefined),
      updatePost: jest.fn().mockResolvedValue(undefined),
    };
    loadData = jest.fn().mockResolvedValue(undefined);
    render = jest.fn();
    jest.clearAllMocks();
  });

  test("does not call render when pipeline reports no updates", async () => {
    (EnrichmentPipeline as jest.MockedClass<typeof EnrichmentPipeline>).mockImplementation(() => ({
      enrichPosts: jest.fn().mockResolvedValue(false),
    } as unknown as EnrichmentPipeline));

    await enrichPostsForArtists(db, [unenrichedPost], [artist], loadData, render);

    expect(render).not.toHaveBeenCalled();
    expect(loadData).not.toHaveBeenCalled();
  });

  test("propagates pipeline errors", async () => {
    (EnrichmentPipeline as jest.MockedClass<typeof EnrichmentPipeline>).mockImplementation(() => ({
      enrichPosts: jest.fn().mockRejectedValue(new Error("Pipeline error")),
    } as unknown as EnrichmentPipeline));

    await expect(enrichPostsForArtists(db, [unenrichedPost], [artist], loadData, render)).rejects.toThrow("Pipeline error");
  });

  test("calls render and loadData when pipeline updates posts", async () => {
    (EnrichmentPipeline as jest.MockedClass<typeof EnrichmentPipeline>).mockImplementation(() => ({
      enrichPosts: jest.fn().mockResolvedValue(true),
    } as unknown as EnrichmentPipeline));

    await enrichPostsForArtists(db, [unenrichedPost], [artist], loadData, render);

    expect(loadData).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });

  test("still delegates already enriched input, but no rerender when pipeline says no change", async () => {
    const enrichPosts = jest.fn().mockResolvedValue(false);
    (EnrichmentPipeline as jest.MockedClass<typeof EnrichmentPipeline>).mockImplementation(() => ({
      enrichPosts,
    } as unknown as EnrichmentPipeline));

    await enrichPostsForArtists(db, [enrichedPost], [artist], loadData, render);

    expect(enrichPosts).toHaveBeenCalledWith([enrichedPost], [artist]);
    expect(render).not.toHaveBeenCalled();
  });
});
