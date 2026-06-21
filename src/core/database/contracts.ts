import { Artist } from "../../shared/types/Artist";
import { Post } from "../../shared/types/Post";

export interface DatabaseLifecycle {
  init(): Promise<void>;
  close(): Promise<void>;
}

export interface VersionStore {
  getTargetVersion(): number;
  getStoredVersion(): Promise<number>;
}

export interface ArtistStore {
  add(artist: Artist): Promise<void>;
  get(id: string): Promise<Artist | undefined>;
  getAll(): Promise<Artist[]>;
  update(artist: Artist): Promise<void>;
}

export interface PostStore {
  add(post: Post): Promise<void>;
  get(id: string): Promise<Post | undefined>;
  getByArtist(artistId: string): Promise<Post[]>;
  getAll(): Promise<Post[]>;
  update(post: Post): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TrackingStore {
  getArtistWithPosts(
    artistId: string,
  ): Promise<{ artist: Artist; posts: Post[] } | null>;
  deleteArtistCascade(artistId: string): Promise<void>;
}

export interface BackupStore {
  exportAllData(): Promise<{ artists: Artist[]; posts: Post[] }>;
  importData(data: { artists: Artist[]; posts: Post[] }): Promise<void>;
  reset(): Promise<void>;
}

export interface LegacyStore {
  exportFromLegacyDb(): Promise<{ artists: Artist[]; posts: Post[] } | null>;
  deleteLegacyDb(): Promise<void>;
}

export interface DatabaseServices {
  lifecycle: DatabaseLifecycle;
  version: VersionStore;
  artists: ArtistStore;
  posts: PostStore;
  tracking: TrackingStore;
  backup: BackupStore;
  legacy: LegacyStore;
}

export interface EnrichmentStore {
  updateArtist(artist: Artist): Promise<void>;
  updatePost(post: Post): Promise<void>;
}
