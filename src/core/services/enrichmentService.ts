import { EnrichmentStore } from "../database/contracts";
import { Artist } from "../../shared/types/Artist";
import { Post } from "../../shared/types/Post";
import { EnrichmentPipeline } from "./enrichmentPipeline";

// ── Artist enrichment ─────────────────────────────────────────────────────────

/**
 * Fetches and persists artist profile data if it is stale or missing.
 * Returns true when the DB was updated.
 */
export async function enrichArtistIfNeeded(
  db: EnrichmentStore,
  artist: Artist,
  host: string,
): Promise<boolean> {
  return new EnrichmentPipeline(db).enrichArtistIfNeeded(artist, host);
}

/**
 * Fetches and persists post metadata if not yet enriched.
 * Returns true when the DB was updated.
 */
export async function enrichPostIfNeeded(
  db: EnrichmentStore,
  post: Post,
  artist: Artist,
  host: string,
): Promise<boolean> {
  return new EnrichmentPipeline(db).enrichPostIfNeeded(post, artist, host);
}

/**
 * Enriches all unenriched posts in `posts` by grouping them by artist.
 * Returns true when at least one DB write occurred.
 */
export async function enrichPosts(
  db: EnrichmentStore,
  posts: Post[],
  artists: Artist[],
): Promise<boolean> {
  return new EnrichmentPipeline(db).enrichPosts(posts, artists);
}

/**
 * Enriches a subset of artists where name or banner is missing.
 * Returns true when at least one DB write occurred.
 */
export async function enrichArtistSubset(
  db: EnrichmentStore,
  subset: Artist[],
): Promise<boolean> {
  return new EnrichmentPipeline(db).enrichArtists(subset);
}
