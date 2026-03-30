import { IMigration } from './IMigration';

// Bumps the DB version to force the onInstalled update flow to run for all
// existing users (storedVersion=1 < targetVersion=2).
// No structural changes — existing data is fully compatible.
// After migration, enrichMissingArtists() in management.ts will populate
// any fields (name, hostname, thumbnail_url, etc.) that are still missing.
export class ForceEnrichmentRefresh implements IMigration {
  readonly version = 2;

  up(_db: IDBDatabase, _tx: IDBTransaction): void { /* no structural change */ }

  down(_db: IDBDatabase, _tx: IDBTransaction): void { /* no structural change */ }
}
