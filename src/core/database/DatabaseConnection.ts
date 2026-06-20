import { MigrationRunner } from "./MigrationRunner";

const DB_NAME = "BetterCK_DB";

const runner = new MigrationRunner();
const DB_VERSION = runner.latestVersion;

/**
 * Manages the raw IndexedDB connection lifecycle.
 * Responsible for opening, closing, and version-checking the database.
 * The MigrationRunner is plugged in here via onupgradeneeded.
 */
export class DatabaseConnection {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  public get targetVersion(): number {
    return DB_VERSION;
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
        runner.run(db, tx, oldVersion, newVersion);
      };
    });

    return this.initPromise;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;
  }

  /**
   * Returns the IDBDatabase handle. Throws if init() has not been called.
   */
  public getDb(): IDBDatabase {
    if (!this.db) {
      throw new Error("Database not initialized. Call init() first.");
    }
    return this.db;
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
      request.onerror = () => resolve(0);
      request.onupgradeneeded = (event) => {
        // DB does not exist yet — abort to avoid creating a ghost database.
        (event.target as IDBOpenDBRequest).transaction?.abort();
      };
    });
  }

  /**
   * Deletes the entire BetterCK_DB database from IndexedDB.
   * Caller must call close() before invoking this.
   */
  public async deleteDatabase(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
