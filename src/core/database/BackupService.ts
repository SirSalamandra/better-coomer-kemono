import { Artist } from "../../shared/types/Artist";
import { Post } from "../../shared/types/Post";
import { DatabaseConnection } from "./DatabaseConnection";

/**
 * Handles data export, bulk import, and full database reset.
 * All operations that don't fit neatly into a single object-store repository
 * belong here.
 */
export class BackupService {
  constructor(private readonly connection: DatabaseConnection) {}

  /**
   * Opens a temporary connection at the currently stored schema version,
   * reads all artists and posts, then closes the connection.
   * Safe to call before init().
   */
  public async exportAllData(): Promise<{ artists: Artist[]; posts: Post[] }> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("BetterCK_DB"); // stored version, no migration
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = (event) => {
        (event.target as IDBOpenDBRequest).transaction?.abort();
      };
      request.onsuccess = () => {
        const tempDb = request.result;
        const tx = tempDb.transaction(["artists", "posts"], "readonly");
        const artistReq = tx.objectStore("artists").getAll();
        const postReq = tx.objectStore("posts").getAll();
        tx.oncomplete = () => {
          tempDb.close();
          resolve({
            artists: artistReq.result as Artist[],
            posts: postReq.result as Post[],
          });
        };
        tx.onerror = () => {
          tempDb.close();
          reject(tx.error);
        };
      };
    });
  }

  /**
   * Upserts all artists and posts from a backup into the current DB.
   * Uses put() so it is safe regardless of whether the migration was destructive.
   * Must be called after init().
   */
  public async importData(data: {
    artists: Artist[];
    posts: Post[];
  }): Promise<void> {
    const db = this.connection.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["artists", "posts"], "readwrite");
      for (const artist of data.artists) tx.objectStore("artists").put(artist);
      for (const post of data.posts) tx.objectStore("posts").put(post);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error ?? new Error("importData transaction aborted"));
    });
  }

  /**
   * Deletes the entire database and reinitializes it with the current schema.
   */
  public async reset(): Promise<void> {
    this.connection.close();
    await this.connection.deleteDatabase();
    await this.connection.init();
  }
}
