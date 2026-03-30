import { Artist } from "../../shared/types/Artist";
import { Post } from "../../shared/types/Post";
import { ArtistProfileDTO } from "../../shared/types/ArtistProfileDTO";
import { PostDTO, PostAttachmentDTO } from "../../shared/types/PostDTO";
import { GetDate } from "../../shared/utils/date";

/**
 * Transforms an artist profile from the API into our internal Artist structure,
 * providing safe fallbacks for missing or empty properties.
 */
export function transformArtistProfile(
  existing: Artist,
  apiData: Partial<ArtistProfileDTO> | null | undefined,
  hostname: string
): Artist {
  const data = apiData || {};
  
  return {
    ...existing,
    // Use fallback if name is null, undefined, or empty string
    name: data.name || existing.name || 'Unknown Artist',
    hostname: hostname || existing.hostname,
    // Provide placeholders/fallbacks for URLs
    thumbnail_url: (data.service && data.id) 
      ? `https://img.${hostname}/icons/${data.service}/${data.id}` 
      : (existing.thumbnail_url || ''),
    banner_url: (data.service && data.id) 
      ? `https://img.${hostname}/banners/${data.service}/${data.id}` 
      : (existing.banner_url || ''),
    // Use existing values or safe defaults
    post_count: data.post_count ?? existing.post_count ?? 0,
    updated_at: data.updated || existing.updated_at || '—',
    last_enriched_at: GetDate(),
  };
}

/**
 * Transforms a post from the API into our internal Post structure,
 * providing safe fallbacks for missing or empty properties.
 */
export function transformPostProfile(
  existing: Post,
  apiPost: Partial<PostDTO> | null | undefined,
  attachments: PostAttachmentDTO[] | null | undefined,
  hostname?: string
): Post {
  const p = apiPost || {};
  
  const filePath = p.file?.path;
  const isImage = filePath && /\.(jpe?g|png|gif|webp|avif|bmp|tiff?)$/i.test(filePath);
  const thumbnail_url = isImage && hostname ? `https://img.${hostname}/thumbnail/data${filePath}` : existing.thumbnail_url;
  
  return {
    ...existing,
    // Use fallback if title is missing or empty
    name: p.title || existing.name || 'Untitled',
    // Fallback for missing dates
    posted_at: p.published || existing.posted_at || '—',
    // Calculate attachment count safely
    attachment_count: attachments?.length ?? existing.attachment_count ?? 0,
    thumbnail_url,
    last_enriched_at: GetDate(),
  };
}
