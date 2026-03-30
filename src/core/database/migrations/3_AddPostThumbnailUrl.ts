import { IMigration } from './IMigration';

// Bumps the DB version to 3 to reflect the addition of 'thumbnail_url' 
// to the Post entity. Since IndexedDB is schema-less for stored objects, 
// no structural change is required in up() unless adding an index.
// Existing posts will be enriched with thumbnails as they are encountered 
// in the UI or visited in the PostPage.
export class AddPostThumbnailUrl implements IMigration {
  readonly version = 3;

  up(_db: IDBDatabase, _tx: IDBTransaction): void { /* no structural change */ }

  down(_db: IDBDatabase, _tx: IDBTransaction): void { /* no structural change */ }
}
