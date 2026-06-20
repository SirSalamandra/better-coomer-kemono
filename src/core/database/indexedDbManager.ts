import { Artist } from "../../shared/types/Artist";
import { Post } from "../../shared/types/Post";
import { DatabaseConnection } from "./DatabaseConnection";
import { ArtistRepository } from "./ArtistRepository";
import { PostRepository } from "./PostRepository";
import { TrackingQueryService } from "./TrackingQueryService";
import { BackupService } from "./BackupService";
import { LegacyMigrationService } from "./LegacyMigrationService";

/**
 * Public façade for all database operations.
 *
 * Preserves the existing singleton API so all callers (background, popup,
 * management, settings, enrichmentService) remain untouched in this phase.
 *
 * Internally delegates to focused internal components:
 *   - DatabaseConnection  — connection lifecycle & version helpers
 *   - ArtistRepository   — artist CRUD
 *   - PostRepository     — post CRUD
 *   - TrackingQueryService — cross-store queries
 *   - BackupService      — export / import / reset
 *   - LegacyMigrationService — BetterSU_DB interop
 */
export class IndexedDbManager {
  private static instance: IndexedDbManager;

  private readonly connection: DatabaseConnection;
  private readonly artistRepo: ArtistRepository;
  private readonly postRepo: PostRepository;
  private readonly trackingQuery: TrackingQueryService;
  private readonly backup: BackupService;
  private readonly legacyMigration: LegacyMigrationService;

  private constructor() {
    this.connection = new DatabaseConnection();
    this.artistRepo = new ArtistRepository(() => this.connection.getDb());
    this.postRepo = new PostRepository(() => this.connection.getDb());
    this.trackingQuery = new TrackingQueryService(this.artistRepo, this.postRepo);
    this.backup = new BackupService(this.connection);
    this.legacyMigration = new LegacyMigrationService();
  }

  public static getInstance(): IndexedDbManager {
    if (!IndexedDbManager.instance) {
      IndexedDbManager.instance = new IndexedDbManager();
    }
    return IndexedDbManager.instance;
  }

  // -------------------------------------------------------------------------
  // Connection lifecycle
  // -------------------------------------------------------------------------

  public async init(): Promise<void> {
    return this.connection.init();
  }

  public async close(): Promise<void> {
    this.connection.close();
  }

  // -------------------------------------------------------------------------
  // Version helpers
  // -------------------------------------------------------------------------

  /** Returns the version number of the latest registered migration. */
  public getTargetVersion(): number {
    return this.connection.targetVersion;
  }

  /**
   * Returns the version currently stored in IndexedDB without running any migrations.
   * Returns 0 if the database does not exist yet.
   */
  public async getStoredVersion(): Promise<number> {
    return this.connection.getStoredVersion();
  }

  // -------------------------------------------------------------------------
  // Artist operations
  // -------------------------------------------------------------------------

  public async addArtist(artist: Artist): Promise<void> {
    return this.artistRepo.add(artist);
  }

  public async getArtist(id: string): Promise<Artist | undefined> {
    return this.artistRepo.get(id);
  }

  public async getAllArtists(): Promise<Artist[]> {
    return this.artistRepo.getAll();
  }

  public async updateArtist(artist: Artist): Promise<void> {
    return this.artistRepo.update(artist);
  }

  public async deleteArtist(id: string): Promise<void> {
    return this.artistRepo.deleteWithPosts(id);
  }

  // -------------------------------------------------------------------------
  // Post operations
  // -------------------------------------------------------------------------

  public async addPost(post: Post): Promise<void> {
    return this.postRepo.add(post);
  }

  public async getPost(id: string): Promise<Post | undefined> {
    return this.postRepo.get(id);
  }

  public async getPostsByArtist(artistId: string): Promise<Post[]> {
    return this.postRepo.getByArtist(artistId);
  }

  public async getAllPosts(): Promise<Post[]> {
    return this.postRepo.getAll();
  }

  public async updatePost(post: Post): Promise<void> {
    return this.postRepo.update(post);
  }

  public async deletePost(id: string): Promise<void> {
    return this.postRepo.delete(id);
  }

  // -------------------------------------------------------------------------
  // Combined / cross-store queries
  // -------------------------------------------------------------------------

  public async getArtistWithPosts(
    artistId: string,
  ): Promise<{ artist: Artist; posts: Post[] } | null> {
    return this.trackingQuery.getArtistWithPosts(artistId);
  }

  // -------------------------------------------------------------------------
  // Backup / restore / reset
  // -------------------------------------------------------------------------

  /**
   * Opens a temporary connection at the currently stored schema version,
   * reads all artists and posts, then closes the connection.
   * Does NOT touch the active db handle — safe to call before init().
   */
  public async exportAllData(): Promise<{ artists: Artist[]; posts: Post[] }> {
    return this.backup.exportAllData();
  }

  /**
   * Upserts all artists and posts from a backup into the current DB.
   * Must be called after init().
   */
  public async importData(data: {
    artists: Artist[];
    posts: Post[];
  }): Promise<void> {
    return this.backup.importData(data);
  }

  /** Deletes the entire database and reinitializes it with the current schema. */
  public async reset(): Promise<void> {
    return this.backup.reset();
  }

  // -------------------------------------------------------------------------
  // Legacy DB interop
  // -------------------------------------------------------------------------

  /**
   * Opens BetterSU_DB (the legacy database name) and exports all data from it.
   * Returns null if the legacy database does not exist.
   * Does NOT touch BetterCK_DB or the active connection.
   */
  public async exportFromLegacyDb(): Promise<{
    artists: Artist[];
    posts: Post[];
  } | null> {
    return this.legacyMigration.exportFromLegacyDb();
  }

  /** Deletes BetterSU_DB (the legacy database name). */
  public async deleteLegacyDb(): Promise<void> {
    return this.legacyMigration.deleteLegacyDb();
  }
}
