import { Artist } from "../../shared/types/Artist";
import { SUPPORTED_HOSTS } from "../../shared/constants/supportedHosts";

const CANONICAL_COOMER_HOST = "coomer.st";
const CANONICAL_KEMONO_HOST = "kemono.cr";
const COOMER_SERVICES = new Set(["onlyfans", "fansly", "candfans", "ppv.land", "manyvids"]);

export class HostResolver {
  static normalizeHostname(host: string | null | undefined): string | null {
    if (!host) return null;

    return host.split(":")[0].toLowerCase();
  }

  static isSupportedHost(host: string | null | undefined): boolean {
    const normalized = this.normalizeHostname(host);
    return normalized != null && SUPPORTED_HOSTS.includes(normalized);
  }

  static resolveArtistHost(artist: Artist): string {
    const normalizedHostname = this.normalizeHostname(artist.hostname);

    if (normalizedHostname) {
      if (this.isSupportedHost(normalizedHostname)) return normalizedHostname;

      const canonicalHost = this.canonicalHostForHostname(normalizedHostname);
      if (canonicalHost) return canonicalHost;
    }

    return COOMER_SERVICES.has(artist.content_origin.toLowerCase())
      ? CANONICAL_COOMER_HOST
      : CANONICAL_KEMONO_HOST;
  }

  private static canonicalHostForHostname(hostname: string): string | null {
    if (hostname.includes("coomer")) return CANONICAL_COOMER_HOST;
    if (hostname.includes("kemono")) return CANONICAL_KEMONO_HOST;
    return null;
  }
}

export function hostForArtist(artist: Artist): string {
  return HostResolver.resolveArtistHost(artist);
}
