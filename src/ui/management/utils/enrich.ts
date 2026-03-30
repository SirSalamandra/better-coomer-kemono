import { IndexedDbManager } from "../../../core/database/indexedDbManager";
import { Artist } from "../../../shared/types/Artist";
import { Post } from "../../../shared/types/Post";
import { ArtistProfileDTO } from "../../../shared/types/ArtistProfileDTO";
import { GetDate } from "../../../shared/utils/date";

const db = IndexedDbManager.getInstance();

/** Thumbnail URL cache only — name/posted_at/attachment_count go to IndexedDB */
export const postCache = new Map<string, string | null>();

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
    if (!postCache.has(post.id) || !post.name) artistIds.add(post.artist_id);
  }
  if (!artistIds.size) return;

  let dbUpdated = false;

  await Promise.allSettled([...artistIds].map(async (artistId) => {
    const artist = artists.find(a => a.id === artistId);
    if (!artist) return;

    const host = hostForArtist(artist);
    const remaining = new Map(
      visiblePosts.filter(p => p.artist_id === artistId).map(p => [p.id, p])
    );

    let offset = 0;
    while (remaining.size > 0) {
      const res = await fetch(
        `https://${host}/api/v1/${artist.content_origin}/user/${artist.id}/posts?limit=50&o=${offset}`,
        { headers: { 'Accept': 'text/css' } }
      );
      if (!res.ok) break;

      const page: any[] = await res.json();
      if (!page.length) break;

      for (const apiPost of page) {
        const stored = remaining.get(apiPost.id);
        if (!stored) continue;
        remaining.delete(apiPost.id);

        const filePath: string | undefined = apiPost.file?.path;
        const isImage = filePath && /\.(jpe?g|png|gif|webp|avif|bmp|tiff?)$/i.test(filePath);
        postCache.set(
          apiPost.id,
          isImage
            ? `https://img.${host}/thumbnail/data${filePath}`
            : null
        );

        if (!stored.name) {
          await db.updatePost({
            ...stored,
            name: apiPost.title,
            posted_at: apiPost.published,
            attachment_count: (apiPost.attachments as any[])?.length ?? 0,
            last_enriched_at: GetDate(),
          });
          dbUpdated = true;
        }
      }

      if (page.length < 50 || remaining.size === 0) break;
      offset += 50;
    }
  }));

  if (dbUpdated) await loadData();
  render();
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

    await db.updateArtist({
      ...artist,
      name: data.name,
      hostname: host,
      thumbnail_url: `https://img.${host}/icons/${data.service}/${data.id}`,
      banner_url: `https://img.${host}/banners/${data.service}/${data.id}`,
      post_count: data.post_count,
      updated_at: data.updated,
      last_enriched_at: GetDate(),
    });
  }));

  await loadData();
  render();
}
