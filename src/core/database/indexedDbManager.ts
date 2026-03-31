import { Artist } from "../../shared/types/Artist";
import { Post } from "../../shared/types/Post";
import { MigrationRunner } from "./MigrationRunner";

const DB_NAME = "BetterCK_DB";
const LEGACY_DB_NAME = "BetterSU_DB";

const runner = new MigrationRunner();
const DB_VERSION = runner.latestVersion; // always equals the highest migration version

export class IndexedDbManager {
  private static instance: IndexedDbManager;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): IndexedDbManager {
    if (!IndexedDbManager.instance) {
      IndexedDbManager.instance = new IndexedDbManager();
    }
    return IndexedDbManager.instance;
  }

  public async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => { this.initPromise = null; reject(request.error); };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = (event.target as IDBOpenDBRequest).transaction!;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion ?? DB_VERSION;

        // MigrationRunner handles both fresh installs (oldVersion=0) and upgrades.
        // Each migration's up() is called exactly once, in version order.
        runner.run(db, tx, oldVersion, newVersion);
      };
    });

    return this.initPromise;
  }

  /** Returns the version number of the latest registered migration. */
  public getTargetVersion(): number {
    return DB_VERSION;
  }

  /**
   * Returns the version currently stored in IndexedDB without running any migrations.
   * Opens the DB without a version argument so no onupgradeneeded is triggered.
   * Returns 0 if the database does not exist yet.
   */
  public async getStoredVersion(): Promise<number> {
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME); // no version → no upgrade
      request.onsuccess = () => {
        const version = request.result.version;
        request.result.close();
        resolve(version);
      };
      request.onerror = () => resolve(0); // catches AbortError from the handler below
      request.onupgradeneeded = (event) => {
        // DB does not exist yet — abort to avoid creating a ghost database.
        (event.target as IDBOpenDBRequest).transaction?.abort();
      };
    });
  }

  /**
   * Opens a temporary connection at the currently stored schema version,
   * reads all artists and posts, then closes the connection.
   * Does NOT touch this.db — safe to call before init().
   */
  public async exportAllData(): Promise<{ artists: Artist[]; posts: Post[] }> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME); // stored version, no migration
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = (event) => {
        (event.target as IDBOpenDBRequest).transaction?.abort();
      };
      request.onsuccess = () => {
        const tempDb = request.result;
        const tx = tempDb.transaction(['artists', 'posts'], 'readonly');
        const artistReq = tx.objectStore('artists').getAll();
        const postReq   = tx.objectStore('posts').getAll();
        tx.oncomplete = () => {
          tempDb.close();
          resolve({ artists: artistReq.result as Artist[], posts: postReq.result as Post[] });
        };
        tx.onerror = () => { tempDb.close(); reject(tx.error); };
      };
    });
  }

  /**
   * Upserts all artists and posts from a backup into the current DB.
   * Uses put() so it is safe regardless of whether the migration was destructive.
   * Must be called after init().
   */
  public async importData(data: { artists: Artist[]; posts: Post[] }): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['artists', 'posts'], 'readwrite');
      for (const artist of data.artists) tx.objectStore('artists').put(artist);
      for (const post   of data.posts)   tx.objectStore('posts').put(post);
      tx.oncomplete = () => resolve();
      tx.onerror   = () => reject(tx.error);
      tx.onabort   = () => reject(tx.error ?? new Error('importData transaction aborted'));
    });
  }

  private getDb(): IDBDatabase {
    if (!this.db) {
      throw new Error("Database not initialized. Call init() first.");
    }
    return this.db;
  }

  // Artist operations
  public async addArtist(artist: Artist): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["artists"], "readwrite");
      const store = transaction.objectStore("artists");
      const request = store.add(artist);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async getArtist(id: string): Promise<Artist | undefined> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["artists"], "readonly");
      const store = transaction.objectStore("artists");
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async getAllArtists(): Promise<Artist[]> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["artists"], "readonly");
      const store = transaction.objectStore("artists");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async updateArtist(artist: Artist): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["artists"], "readwrite");
      const store = transaction.objectStore("artists");
      const request = store.put(artist);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteArtist(id: string): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["artists", "posts"], "readwrite");
      const artistStore = transaction.objectStore("artists");
      const postStore = transaction.objectStore("posts");

      // Delete artist
      artistStore.delete(id);

      // Delete all posts for this artist
      const index = postStore.index("artist_id");
      const request = index.openCursor(IDBKeyRange.only(id));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Post operations
  public async addPost(post: Post): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["posts"], "readwrite");
      const store = transaction.objectStore("posts");
      const request = store.add(post);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async getPost(id: string): Promise<Post | undefined> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["posts"], "readonly");
      const store = transaction.objectStore("posts");
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async getPostsByArtist(artistId: string): Promise<Post[]> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["posts"], "readonly");
      const store = transaction.objectStore("posts");
      const index = store.index("artist_id");
      const request = index.getAll(artistId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async getAllPosts(): Promise<Post[]> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["posts"], "readonly");
      const store = transaction.objectStore("posts");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async updatePost(post: Post): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["posts"], "readwrite");
      const store = transaction.objectStore("posts");
      const request = store.put(post);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deletePost(id: string): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["posts"], "readwrite");
      const store = transaction.objectStore("posts");
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Combined operations
  public async getArtistWithPosts(artistId: string): Promise<{ artist: Artist; posts: Post[] } | null> {
    const artist = await this.getArtist(artistId);
    if (!artist) return null;

    const posts = await this.getPostsByArtist(artistId);
    return { artist, posts };
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;
  }

  /**
   * Opens BetterSU_DB (the legacy database name) and exports all data from it.
   * Returns null if the legacy database does not exist.
   * Does NOT touch the current BetterCK_DB or this.db.
   */
  public async exportFromLegacyDb(): Promise<{ artists: Artist[]; posts: Post[] } | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open(LEGACY_DB_NAME);
      request.onerror = () => resolve(null);
      request.onupgradeneeded = (event) => {
        // DB doesn't exist — abort to avoid creating it, then resolve with null.
        (event.target as IDBOpenDBRequest).transaction?.abort();
        resolve(null);
      };
      request.onsuccess = () => {
        const legacyDb = request.result;
        if (!legacyDb.objectStoreNames.contains('artists') || !legacyDb.objectStoreNames.contains('posts')) {
          legacyDb.close();
          resolve(null);
          return;
        }
        const tx = legacyDb.transaction(['artists', 'posts'], 'readonly');
        const artistReq = tx.objectStore('artists').getAll();
        const postReq   = tx.objectStore('posts').getAll();
        tx.oncomplete = () => {
          legacyDb.close();
          resolve({ artists: artistReq.result as Artist[], posts: postReq.result as Post[] });
        };
        tx.onerror = () => { legacyDb.close(); resolve(null); };
      };
    });
  }

  /** Deletes BetterSU_DB (the legacy database name). */
  public async deleteLegacyDb(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(LEGACY_DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /** Deletes the entire database and reinitializes it with the current schema. */
  public async reset(): Promise<void> {
    await this.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    await this.init();
  }
}
