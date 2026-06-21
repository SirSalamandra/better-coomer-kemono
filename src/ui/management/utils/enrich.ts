import { IndexedDbManager } from "../../../core/database/indexedDbManager";
import { EnrichmentPipeline } from "../../../core/services/enrichmentPipeline";
import { Artist } from "../../../shared/types/Artist";
import { Post } from "../../../shared/types/Post";

export async function enrichPostsForArtists(
  db: IndexedDbManager,
  visiblePosts: Post[],
  artists: Artist[],
  loadData: () => Promise<void>,
  render: () => void,
): Promise<void> {
  const dbUpdated = await new EnrichmentPipeline(db).enrichPosts(visiblePosts, artists);

  if (dbUpdated) {
    await loadData();
    render();
  }
}

export async function enrichArtists(
  db: IndexedDbManager,
  subset: Artist[],
  loadData: () => Promise<void>,
  render: () => void,
): Promise<void> {
  const dbUpdated = await new EnrichmentPipeline(db).enrichArtists(subset);
  if (!dbUpdated) return;

  await loadData();
  render();
}
