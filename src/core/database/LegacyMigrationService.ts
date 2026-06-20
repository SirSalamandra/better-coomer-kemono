import { Artist } from "../../shared/types/Artist";
import { Post } from "../../shared/types/Post";

const LEGACY_DB_NAME = "BetterSU_DB";

/**
 * Isolates all knowledge of the legacy "BetterSU_DB" database.
 * Handles exporting data out of the old database and deleting it once migrated.
 */
export class LegacyMigrationService {
  /**
   * Opens BetterSU_DB and exports all data from it.
   * Returns null if the legacy database does not exist or has no recognised stores.
   * Does NOT touch BetterCK_DB or any active connection.
   */
  public async exportFromLegacyDb(): Promise<{
    artists: Artist[];
    posts: Post[];
  } | null> {
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
        if (
          !legacyDb.objectStoreNames.contains("artists") ||
          !legacyDb.objectStoreNames.contains("posts")
        ) {
          legacyDb.close();
          resolve(null);
          return;
        }
        const tx = legacyDb.transaction(["artists", "posts"], "readonly");
        const artistReq = tx.objectStore("artists").getAll();
        const postReq = tx.objectStore("posts").getAll();
        tx.oncomplete = () => {
          legacyDb.close();
          resolve({
            artists: artistReq.result as Artist[],
            posts: postReq.result as Post[],
          });
        };
        tx.onerror = () => {
          legacyDb.close();
          resolve(null);
        };
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
}
