import { Post } from "../../shared/types/Post";

/**
 * CRUD operations for the "posts" object store.
 * Receives an IDBDatabase handle from the caller (typically DatabaseConnection).
 */
export class PostRepository {
  constructor(private readonly getDb: () => IDBDatabase) {}

  public async add(post: Post): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["posts"], "readwrite");
      const store = tx.objectStore("posts");
      const request = store.add(post);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async get(id: string): Promise<Post | undefined> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["posts"], "readonly");
      const store = tx.objectStore("posts");
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async getByArtist(artistId: string): Promise<Post[]> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["posts"], "readonly");
      const store = tx.objectStore("posts");
      const index = store.index("artist_id");
      const request = index.getAll(artistId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async getAll(): Promise<Post[]> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["posts"], "readonly");
      const store = tx.objectStore("posts");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async update(post: Post): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["posts"], "readwrite");
      const store = tx.objectStore("posts");
      const request = store.put(post);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async delete(id: string): Promise<void> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["posts"], "readwrite");
      const store = tx.objectStore("posts");
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
