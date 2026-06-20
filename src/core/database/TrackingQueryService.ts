import { Artist } from "../../shared/types/Artist";
import { Post } from "../../shared/types/Post";
import { ArtistRepository } from "./ArtistRepository";
import { PostRepository } from "./PostRepository";

/**
 * Thin service for queries that span both the artist and post stores.
 * Lives above the individual repositories to avoid coupling them to each other.
 */
export class TrackingQueryService {
  constructor(
    private readonly artists: ArtistRepository,
    private readonly posts: PostRepository,
  ) {}

  /**
   * Returns the artist and all of their associated posts.
   * Returns null if the artist does not exist.
   */
  public async getArtistWithPosts(
    artistId: string,
  ): Promise<{ artist: Artist; posts: Post[] } | null> {
    const artist = await this.artists.get(artistId);
    if (!artist) return null;
    const posts = await this.posts.getByArtist(artistId);
    return { artist, posts };
  }
}
