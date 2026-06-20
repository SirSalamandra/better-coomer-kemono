import { ArtistProfileDTO } from "../../shared/types/ArtistProfileDTO";
import { PostResponseDTO } from "../../shared/types/PostDTO";

const FETCH_HEADERS = { 'Accept': 'text/css' } as const;

// ── URL builders ──────────────────────────────────────────────────────────────

export function buildArtistProfileUrl(
  host: string,
  contentOrigin: string,
  artistId: string,
): string {
  return `https://${host}/api/v1/${contentOrigin}/user/${artistId}/profile`;
}

export function buildPostUrl(
  host: string,
  contentOrigin: string,
  artistId: string,
  postId: string,
): string {
  return `https://${host}/api/v1/${contentOrigin}/user/${artistId}/post/${postId}`;
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

/**
 * Fetches an artist profile from the API.
 * Returns null when the server responds with a non-OK status.
 * Throws on network errors so callers can decide whether to log/ignore.
 */
export async function fetchArtistProfile(
  host: string,
  contentOrigin: string,
  artistId: string,
): Promise<ArtistProfileDTO | null> {
  const url = buildArtistProfileUrl(host, contentOrigin, artistId);
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) return null;
  return res.json() as Promise<ArtistProfileDTO>;
}

/**
 * Fetches a post from the API.
 * Returns null when the server responds with a non-OK status.
 * Throws on network errors so callers can decide whether to log/ignore.
 */
export async function fetchPostDetails(
  host: string,
  contentOrigin: string,
  artistId: string,
  postId: string,
): Promise<PostResponseDTO | null> {
  const url = buildPostUrl(host, contentOrigin, artistId, postId);
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) return null;
  return res.json() as Promise<PostResponseDTO>;
}
