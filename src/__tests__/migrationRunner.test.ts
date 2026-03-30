/**
 * @jest-environment node
 */

import { IDBFactory } from 'fake-indexeddb';
import { MigrationRunner } from '../core/database/MigrationRunner';
import { IMigration } from '../core/database/migrations/IMigration';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeDb(): IDBDatabase {
  // We only need createObjectStore — return a minimal stub.
  return {
    createObjectStore: jest.fn().mockReturnValue({ createIndex: jest.fn() }),
    deleteObjectStore: jest.fn(),
  } as unknown as IDBDatabase;
}

function fakeTx(): IDBTransaction {
  return {} as IDBTransaction;
}

function makeMigration(version: number, up = jest.fn(), down = jest.fn()): IMigration {
  return { version, up, down };
}

// ---------------------------------------------------------------------------
// latestVersion
// ---------------------------------------------------------------------------

describe('MigrationRunner.latestVersion', () => {
  test('returns the highest registered migration version', () => {
    const runner = new MigrationRunner();
    // The real migrations are v1 and v2
    expect(runner.latestVersion).toBe(2);
  });

  test('works for a runner built from custom migrations', () => {
    const runner = new MigrationRunner();
    (runner as any).migrations = [makeMigration(3), makeMigration(7), makeMigration(5)];
    expect(runner.latestVersion).toBe(7);
  });

  test('returns 1 when only a single migration exists', () => {
    const runner = new MigrationRunner();
    (runner as any).migrations = [makeMigration(1)];
    expect(runner.latestVersion).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// run — which migrations are applied
// ---------------------------------------------------------------------------

describe('MigrationRunner.run', () => {
  test('applies all migrations on a fresh install (oldVersion=0)', () => {
    const m1 = makeMigration(1);
    const m2 = makeMigration(2);
    const runner = new MigrationRunner();
    (runner as any).migrations = [m1, m2];

    const db = fakeDb();
    const tx = fakeTx();
    runner.run(db, tx, 0, 2);

    expect(m1.up).toHaveBeenCalledTimes(1);
    expect(m2.up).toHaveBeenCalledTimes(1);
  });

  test('skips migrations already applied (oldVersion > 0)', () => {
    const m1 = makeMigration(1);
    const m2 = makeMigration(2);
    const m3 = makeMigration(3);
    const runner = new MigrationRunner();
    (runner as any).migrations = [m1, m2, m3];

    runner.run(fakeDb(), fakeTx(), 1, 3); // already at v1

    expect(m1.up).not.toHaveBeenCalled();
    expect(m2.up).toHaveBeenCalledTimes(1);
    expect(m3.up).toHaveBeenCalledTimes(1);
  });

  test('applies exactly the migration at newVersion boundary', () => {
    const m1 = makeMigration(1);
    const m2 = makeMigration(2);
    const runner = new MigrationRunner();
    (runner as any).migrations = [m1, m2];

    runner.run(fakeDb(), fakeTx(), 0, 1); // only v1

    expect(m1.up).toHaveBeenCalledTimes(1);
    expect(m2.up).not.toHaveBeenCalled();
  });

  test('excludes the migration at oldVersion boundary', () => {
    const m2 = makeMigration(2);
    const runner = new MigrationRunner();
    (runner as any).migrations = [m2];

    runner.run(fakeDb(), fakeTx(), 2, 2); // already at v2 — nothing pending

    expect(m2.up).not.toHaveBeenCalled();
  });

  test('applies migrations in ascending version order regardless of registration order', () => {
    const callOrder: number[] = [];
    const m3 = makeMigration(3, jest.fn(() => callOrder.push(3)));
    const m1 = makeMigration(1, jest.fn(() => callOrder.push(1)));
    const m2 = makeMigration(2, jest.fn(() => callOrder.push(2)));
    const runner = new MigrationRunner();
    (runner as any).migrations = [m3, m1, m2]; // deliberately out of order

    runner.run(fakeDb(), fakeTx(), 0, 3);

    expect(callOrder).toEqual([1, 2, 3]);
  });

  test('does nothing when there are no pending migrations', () => {
    const m1 = makeMigration(1);
    const runner = new MigrationRunner();
    (runner as any).migrations = [m1];

    runner.run(fakeDb(), fakeTx(), 5, 10); // no migrations in range

    expect(m1.up).not.toHaveBeenCalled();
  });

  test('passes the db and tx arguments to each migration', () => {
    const up = jest.fn();
    const runner = new MigrationRunner();
    (runner as any).migrations = [makeMigration(1, up)];

    const db = fakeDb();
    const tx = fakeTx();
    runner.run(db, tx, 0, 1);

    expect(up).toHaveBeenCalledWith(db, tx);
  });
});
