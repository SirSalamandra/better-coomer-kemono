import { Artist } from "../types/Artist";
import { Post } from "../types/Post";

const DB_NAME = "BetterSU_DB";
const DB_VERSION = 1;

// export interface PostWithArtist extends Post {
//   artistId: string;
// }

export class IndexedDbManager {
  private static instance: IndexedDbManager;
  private db: IDBDatabase | null = null;

  private constructor() {}

  public static getInstance(): IndexedDbManager {
    if (!IndexedDbManager.instance) {
      IndexedDbManager.instance = new IndexedDbManager();
    }
    return IndexedDbManager.instance;
  }

  public async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create artists object store
        if (!db.objectStoreNames.contains("artists")) {
          const artistStore = db.createObjectStore("artists", { keyPath: "id" });
          artistStore.createIndex("name", "name", { unique: false });
          artistStore.createIndex("content_origin", "content_origin", { unique: false });
        }

        // Create posts object store with artistId foreign key
        if (!db.objectStoreNames.contains("posts")) {
          const postStore = db.createObjectStore("posts", { keyPath: "id" });
          postStore.createIndex("artist_id", "artist_id", { unique: false });
          postStore.createIndex("viewed_at", "viewed_at", { unique: false });
        }
      };
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
  }
}
