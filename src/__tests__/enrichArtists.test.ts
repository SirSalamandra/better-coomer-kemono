import { enrichArtists } from "../ui/management/utils/enrich";
import { EnrichmentPipeline } from "../core/services/enrichmentPipeline";
import { IndexedDbManager } from "../core/database/indexedDbManager";
import { Artist } from "../shared/types/Artist";

jest.mock("../core/services/enrichmentPipeline");

const incompleteArtist: Artist = { id: "a1", content_origin: "patreon" };

describe("enrichArtists", () => {
  let db: IndexedDbManager;
  let loadData: jest.Mock;
  let render: jest.Mock;

  beforeEach(() => {
    db = {
      updateArtist: jest.fn().mockResolvedValue(undefined),
    } as unknown as IndexedDbManager;
    loadData = jest.fn().mockResolvedValue(undefined);
    render = jest.fn();
    jest.clearAllMocks();
  });

  test("does not call render when pipeline reports no updates", async () => {
    (EnrichmentPipeline as jest.MockedClass<typeof EnrichmentPipeline>).mockImplementation(() => ({
      enrichArtists: jest.fn().mockResolvedValue(false),
    } as unknown as EnrichmentPipeline));

    await enrichArtists(db, [incompleteArtist], loadData, render);

    expect(loadData).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  test("calls render and loadData when pipeline updates artists", async () => {
    (EnrichmentPipeline as jest.MockedClass<typeof EnrichmentPipeline>).mockImplementation(() => ({
      enrichArtists: jest.fn().mockResolvedValue(true),
    } as unknown as EnrichmentPipeline));

    await enrichArtists(db, [incompleteArtist], loadData, render);

    expect(loadData).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });
});
