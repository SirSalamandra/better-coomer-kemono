import { IndexedDbManager } from "../../../core/database/indexedDbManager";
import { Artist } from "../../../shared/types/Artist";
import { Post } from "../../../shared/types/Post";
import { ArtistProfileDTO } from "../../../shared/types/ArtistProfileDTO";
import { transformArtistProfile, transformPostProfile } from "../../../core/utils/enrichment";
import { PostResponseDTO } from "../../../shared/types/PostDTO";

const db = IndexedDbManager.getInstance();

const COOMER_SERVICES = new Set(['onlyfans', 'fansly', 'candfans', 'ppv.land', 'manyvids']);

export function hostForArtist(artist: Artist): string {
  if (artist.hostname) {
    if (artist.hostname.includes('coomer')) return 'coomer.st';
    if (artist.hostname.includes('kemono')) return 'kemono.cr';
  }
  return COOMER_SERVICES.has(artist.content_origin.toLowerCase()) ? 'coomer.st' : 'kemono.cr';
}

export async function enrichPostsForArtists(
  visiblePosts: Post[],
  artists: Artist[],
  loadData: () => Promise<void>,
  render: () => void,
): Promise<void> {
  const artistIds = new Set<string>();
  for (const post of visiblePosts) {
    if (!post.artist_id) continue;
    if (!post.last_enriched_at) artistIds.add(post.artist_id);
  }
  if (!artistIds.size) return;

  let dbUpdated = false;

  await Promise.allSettled([...artistIds].map(async (artistId) => {
    const artist = artists.find(a => a.id === artistId);
    if (!artist) return;

    const host = hostForArtist(artist);
    const missingPosts = visiblePosts.filter(p => p.artist_id === artistId && !p.last_enriched_at);

    await Promise.allSettled(missingPosts.map(async (storedPost) => {
      const res = await fetch(
        `https://${host}/api/v1/${artist.content_origin}/user/${artist.id}/post/${storedPost.id}`,
        { headers: { 'Accept': 'text/css' } }
      );
      if (!res.ok) return;

      const data: PostResponseDTO = await res.json();
      const enrichedPost = transformPostProfile(storedPost, data.post, data.attachments, host);
      await db.updatePost(enrichedPost);
      dbUpdated = true;
    }));
  }));

  if (dbUpdated) {
    await loadData();
    render();
  }
}

export async function enrichArtists(
  subset: Artist[],
  loadData: () => Promise<void>,
  render: () => void,
): Promise<void> {
  const toEnrich = subset.filter(a => !a.name || !a.banner_url);
  if (!toEnrich.length) return;

  await Promise.allSettled(toEnrich.map(async (artist) => {
    const host = hostForArtist(artist);
    const url = `https://${host}/api/v1/${artist.content_origin}/user/${artist.id}/profile`;

    const res = await fetch(url, { headers: { 'Accept': 'text/css' } });
    if (!res.ok) return;

    const data: ArtistProfileDTO = await res.json();
    const enrichedArtist = transformArtistProfile(artist, data, host);
    await db.updateArtist(enrichedArtist);
  }));

  await loadData();
  render();
}
