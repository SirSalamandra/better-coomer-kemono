import { IndexedDbManager } from "../database/indexedDbManager";
import { Artist } from "../../shared/types/Artist";
import { Post } from "../../shared/types/Post";
import { hostForArtist } from "../hosts/HostResolver";
import { transformArtistProfile, transformPostProfile } from "../utils/enrichment";
import { fetchArtistProfile, fetchPostDetails } from "./apiClient";

export class EnrichmentPipeline {
  constructor(private readonly db: IndexedDbManager) {}

  async enrichArtistIfNeeded(artist: Artist, host = hostForArtist(artist)): Promise<boolean> {
    const now = new Date();
    const lastEnriched = artist.last_enriched_at ? new Date(artist.last_enriched_at) : null;
    const isStale = !lastEnriched || (now.getTime() - lastEnriched.getTime() > 24 * 60 * 60 * 1000);
    const shouldEnrich = isStale || !artist.name;

    if (!shouldEnrich) return false;

    try {
      const data = await fetchArtistProfile(host, artist.content_origin, artist.id);
      if (!data) return false;
      const enriched = transformArtistProfile(artist, data, host);
      await this.db.updateArtist(enriched);
      return true;
    } catch (err) {
      console.warn("EnrichmentPipeline: failed to enrich artist", artist.id, err);
      return false;
    }
  }

  async enrichPostIfNeeded(
    post: Post,
    artist: Artist,
    host = hostForArtist(artist),
  ): Promise<boolean> {
    if (post.last_enriched_at) return false;

    try {
      const data = await fetchPostDetails(host, artist.content_origin, artist.id, post.id);
      if (!data) return false;
      const enriched = transformPostProfile(post, data.post, data.attachments, host);
      await this.db.updatePost(enriched);
      return true;
    } catch (err) {
      console.warn("EnrichmentPipeline: failed to enrich post", post.id, err);
      return false;
    }
  }

  async enrichPosts(posts: Post[], artists: Artist[]): Promise<boolean> {
    const unenriched = posts.filter(post => !post.last_enriched_at && post.artist_id);
    if (!unenriched.length) return false;

    const artistsById = new Map(artists.map(artist => [artist.id, artist]));
    let anyUpdated = false;

    await Promise.allSettled([...new Set(unenriched.map(post => post.artist_id!))].map(async (artistId) => {
      const artist = artistsById.get(artistId);
      if (!artist) return;

      const host = hostForArtist(artist);
      const artistPosts = unenriched.filter(post => post.artist_id === artistId);
      const results = await Promise.allSettled(
        artistPosts.map(post => this.enrichPostIfNeeded(post, artist, host))
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) anyUpdated = true;
      }
    }));

    return anyUpdated;
  }

  async enrichArtists(artists: Artist[]): Promise<boolean> {
    const toEnrich = artists.filter(artist => !artist.name || !artist.banner_url);
    if (!toEnrich.length) return false;

    let anyUpdated = false;

    await Promise.allSettled(toEnrich.map(async (artist) => {
      const updated = await this.enrichArtistIfNeeded(artist);
      if (updated) anyUpdated = true;
    }));

    return anyUpdated;
  }
}
