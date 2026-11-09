import 'reflect-metadata';
import { DatabaseFactory } from '../config/database.config';
import { collectQueueStats, replayFailedRequest } from '../modules/solicitudes-suscripcion/infrastructure/queue-ops';

// Usage: node dist/workers/queue-admin.js stats | replay <requestId> <operator>
async function main(): Promise<void> {
  const [command, requestId, operator] = process.argv.slice(2);
  const db = DatabaseFactory.createDataSource();
  await db.initialize();
  try {
    if (command === 'stats') process.stdout.write(`${JSON.stringify(await collectQueueStats(db), null, 2)}\n`);
    else if (command === 'replay' && requestId && operator) await replayFailedRequest(db, requestId, operator);
    else throw new Error('Usage: queue-admin stats | replay <requestId> <operator>');
  } finally { await db.destroy(); }
}
main().catch((error: Error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
