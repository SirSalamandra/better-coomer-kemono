import { Artist } from "../types/Artist";

const COOMER_SERVICES = new Set(["onlyfans", "fansly", "candfans", "ppv.land", "manyvids"]);

export function hostForArtist(artist: Artist): string {
  if (artist.hostname) {
    if (artist.hostname.includes("coomer")) return "coomer.st";
    if (artist.hostname.includes("kemono")) return "kemono.cr";
  }
  return COOMER_SERVICES.has(artist.content_origin.toLowerCase()) ? "coomer.st" : "kemono.cr";
}
