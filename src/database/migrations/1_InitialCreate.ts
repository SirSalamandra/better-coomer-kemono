import { IMigration } from './IMigration';

export class InitialCreate implements IMigration {
  readonly version = 1;

  up(db: IDBDatabase, _tx: IDBTransaction): void {
    const artistStore = db.createObjectStore('artists', { keyPath: 'id' });
    artistStore.createIndex('name', 'name', { unique: false });
    artistStore.createIndex('content_origin', 'content_origin', { unique: false });

    const postStore = db.createObjectStore('posts', { keyPath: 'id' });
    postStore.createIndex('artist_id', 'artist_id', { unique: false });
    postStore.createIndex('viewed_at', 'viewed_at', { unique: false });
  }

  down(db: IDBDatabase, _tx: IDBTransaction): void {
    db.deleteObjectStore('artists');
    db.deleteObjectStore('posts');
  }
}
