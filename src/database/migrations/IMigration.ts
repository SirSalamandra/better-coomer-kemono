export interface IMigration {
  readonly version: number;
  up(db: IDBDatabase, tx: IDBTransaction): void;
  down(db: IDBDatabase, tx: IDBTransaction): void;
}
