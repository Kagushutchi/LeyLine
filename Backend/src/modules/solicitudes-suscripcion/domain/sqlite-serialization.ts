import { DataSource } from 'typeorm';

// A SQLite DataSource uses one connection: concurrent transactions cannot overlap.
const queues = new WeakMap<DataSource, Promise<void>>();
export async function serializeSqlite<T>(db: DataSource, operation: () => Promise<T>): Promise<T> {
  if (db.options.type !== 'sqlite') return operation();
  const previous = queues.get(db) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  queues.set(db, current);
  await previous;
  try { return await operation(); } finally {
    release();
    if (queues.get(db) === current) queues.delete(db);
  }
}
