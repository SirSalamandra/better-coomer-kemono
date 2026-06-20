import { IndexedDbManager } from "../database/indexedDbManager";
import { Artist } from "../../shared/types/Artist";
import { Post } from "../../shared/types/Post";
import { transformArtistProfile, transformPostProfile } from "../utils/enrichment";
import { fetchArtistProfile, fetchPostDetails } from "./apiClient";
import { hostForArtist } from "../../ui/management/utils/enrich";

// ── Artist enrichment ─────────────────────────────────────────────────────────

/**
 * Fetches and persists artist profile data if it is stale or missing.
 * Returns true when the DB was updated.
 */
export async function enrichArtistIfNeeded(
  db: IndexedDbManager,
  artist: Artist,
  host: string,
): Promise<boolean> {
  const now = new Date();
  const lastEnriched = artist.last_enriched_at ? new Date(artist.last_enriched_at) : null;
  const isStale = !lastEnriched || (now.getTime() - lastEnriched.getTime() > 24 * 60 * 60 * 1000);
  const shouldEnrich = isStale || !artist.name;

  if (!shouldEnrich) return false;

  try {
    const data = await fetchArtistProfile(host, artist.content_origin, artist.id);
    if (!data) return false;
    const enriched = transformArtistProfile(artist, data, host);
    await db.updateArtist(enriched);
    return true;
  } catch (err) {
    console.warn('enrichmentService: failed to enrich artist', artist.id, err);
    return false;
  }
}

/**
 * Fetches and persists post metadata if not yet enriched.
 * Returns true when the DB was updated.
 */
export async function enrichPostIfNeeded(
  db: IndexedDbManager,
  post: Post,
  artist: Artist,
  host: string,
): Promise<boolean> {
  if (post.last_enriched_at) return false;

  try {
    const data = await fetchPostDetails(host, artist.content_origin, artist.id, post.id);
    if (!data) return false;
    const enriched = transformPostProfile(post, data.post, data.attachments, host);
    await db.updatePost(enriched);
    return true;
  } catch (err) {
    console.warn('enrichmentService: failed to enrich post', post.id, err);
    return false;
  }
}

/**
 * Enriches all unenriched posts in `posts` by grouping them by artist.
 * Returns true when at least one DB write occurred.
 */
export async function enrichPosts(
  db: IndexedDbManager,
  posts: Post[],
  artists: Artist[],
): Promise<boolean> {
  const unenriched = posts.filter(p => !p.last_enriched_at && p.artist_id);
  if (!unenriched.length) return false;

  const artistIds = new Set(unenriched.map(p => p.artist_id!));
  let anyUpdated = false;

  await Promise.allSettled([...artistIds].map(async (artistId) => {
    const artist = artists.find(a => a.id === artistId);
    if (!artist) return;

    const host = hostForArtist(artist);
    const artistPosts = unenriched.filter(p => p.artist_id === artistId);

    const results = await Promise.allSettled(
      artistPosts.map(post => enrichPostIfNeeded(db, post, artist, host))
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) anyUpdated = true;
    }
  }));

  return anyUpdated;
}

/**
 * Enriches a subset of artists where name or banner is missing.
 * Returns true when at least one DB write occurred.
 */
export async function enrichArtistSubset(
  db: IndexedDbManager,
  subset: Artist[],
): Promise<boolean> {
  const toEnrich = subset.filter(a => !a.name || !a.banner_url);
  if (!toEnrich.length) return false;

  let anyUpdated = false;

  await Promise.allSettled(toEnrich.map(async (artist) => {
    const host = hostForArtist(artist);
    const updated = await enrichArtistIfNeeded(db, artist, host);
    if (updated) anyUpdated = true;
  }));

  return anyUpdated;
}
