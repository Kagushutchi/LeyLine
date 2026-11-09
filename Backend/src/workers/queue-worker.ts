import 'reflect-metadata';
import { startQueueWorker } from '../modules/solicitudes-suscripcion/infrastructure/queue-runtime';

// Process entrypoint only: start, wire signals, exit. Logic lives in queue-runtime.ts.
if (require.main === module) {
  void startQueueWorker().then((shutdown) => {
    const stop = () => { void shutdown().then(() => { process.exitCode = 0; }, () => { process.exitCode = 1; }); };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  }).catch((error: Error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
