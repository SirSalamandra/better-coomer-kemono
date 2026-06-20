import { Artist } from "../../shared/types/Artist";

/**
 * CRUD operations for the "artists" object store.
 * Receives an IDBDatabase handle from the caller (typically DatabaseConnection).
 */
export class ArtistRepository {
  constructor(private readonly getDb: () => IDBDatabase) {}

  public async add(artist: Artist): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["artists"], "readwrite");
      const store = tx.objectStore("artists");
      const request = store.add(artist);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async get(id: string): Promise<Artist | undefined> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["artists"], "readonly");
      const store = tx.objectStore("artists");
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async getAll(): Promise<Artist[]> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["artists"], "readonly");
      const store = tx.objectStore("artists");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async update(artist: Artist): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["artists"], "readwrite");
      const store = tx.objectStore("artists");
      const request = store.put(artist);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Deletes the artist record AND all posts belonging to that artist
   * in a single cross-store transaction.
   * Kept here (rather than PostRepository) because the cascade is the
   * artist's responsibility semantically, but it genuinely spans both stores.
   */
  public async deleteWithPosts(id: string): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["artists", "posts"], "readwrite");
      const artistStore = tx.objectStore("artists");
      const postStore = tx.objectStore("posts");

      artistStore.delete(id);

      const index = postStore.index("artist_id");
      const cursorRequest = index.openCursor(IDBKeyRange.only(id));
      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
