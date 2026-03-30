import { IMigration } from './migrations/IMigration';
import { InitialCreate } from './migrations/1_InitialCreate';
import { ForceEnrichmentRefresh } from './migrations/2_ForceEnrichmentRefresh';

export class MigrationRunner {
  private readonly migrations: IMigration[] = [
    new InitialCreate(),
    new ForceEnrichmentRefresh(),
  ];

  /** The version number of the latest registered migration — used as IDB DB_VERSION. */
  public get latestVersion(): number {
    return Math.max(...this.migrations.map(m => m.version));
  }

  /**
   * Applies every migration whose version is in the range (oldVersion, newVersion].
   * Called inside the IndexedDB `onupgradeneeded` versionchange transaction.
   */
  public run(db: IDBDatabase, tx: IDBTransaction, oldVersion: number, newVersion: number): void {
    const pending = this.migrations
      .filter(m => m.version > oldVersion && m.version <= newVersion)
      .sort((a, b) => a.version - b.version);

    for (const migration of pending) {
      migration.up(db, tx);
    }
  }
}
