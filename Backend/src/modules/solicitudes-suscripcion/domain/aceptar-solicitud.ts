import { createHash, randomUUID } from 'crypto';
import { DataSource, In, QueryFailedError } from 'typeorm';
import { Suscripcion } from '../../suscripciones/infrastructure/suscripcion.entity';
import { AppError } from '../../../common/errors/app-error';
import { MensajeOutbox } from '../infrastructure/outbox.entity';
import { SolicitudSuscripcion } from '../infrastructure/solicitud.entity';
import { CajaMensual } from '../../cajas-mensuales/infrastructure/caja-mensual.entity';
import { serializeSqlite } from './sqlite-serialization';

export class SolicitudConflictError extends AppError {
  constructor(public readonly code: 'PRICE_CHANGED' | 'IDEMPOTENCY_KEY_CONFLICT' | 'ALREADY_SUBSCRIBED' | 'REQUEST_IN_PROGRESS', message: string) {
    super(message, 409);
  }
}

// The caller must authenticate, authorize and validate the box and subscriber.
// This internal service is deliberately not exposed through HTTP.
export interface SolicitudAutorizada {
  principalId: string;
  suscriptorId: string;
  cajaMensualId: string;
  idempotencyKey: string;
  precioConfirmadoCentavos: number;
}

export function centavos(value: unknown): number | null {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') return null;
  const number = Number(value);
  const scaled = Math.round(number * 100);
  return Number.isFinite(number) && number > 0 && scaled <= 9999999999 && Math.abs(number * 100 - scaled) < 1e-6 ? scaled : null;
}


export class AceptarSolicitud {
  constructor(private readonly db: DataSource) {}

  async execute(input: SolicitudAutorizada): Promise<SolicitudSuscripcion> {
    for (const value of [input.principalId, input.suscriptorId, input.cajaMensualId, input.idempotencyKey]) {
      if (typeof value !== 'string' || !value.trim() || value !== value.trim()) {
        throw new AppError('Datos de solicitud inválidos', 400);
      }
    }
    if (input.idempotencyKey.length > 128) throw new AppError('Clave de idempotencia inválida', 400);
    if ([input.principalId, input.suscriptorId, input.cajaMensualId].some((value) => value.length > 100)) {
      throw new AppError('Datos de solicitud inválidos', 400);
    }
    const confirmedCents = input.precioConfirmadoCentavos;
    if (!Number.isSafeInteger(confirmedCents) || confirmedCents <= 0 || confirmedCents > 9999999999) throw new AppError('Precio confirmado inválido', 400);
    const payloadHash = createHash('sha256').update(JSON.stringify({
      cajaMensualId: input.cajaMensualId, suscriptorId: input.suscriptorId, precioConfirmado: confirmedCents,
    })).digest('hex');
    const where = { principalId: input.principalId, idempotencyKey: input.idempotencyKey };
    const resolveExisting = (existing: SolicitudSuscripcion): SolicitudSuscripcion => {
      if (existing.payloadHash !== payloadHash) throw new SolicitudConflictError('IDEMPOTENCY_KEY_CONFLICT', 'La clave de idempotencia ya fue utilizada con otros datos');
      return existing;
    };

    return serializeSqlite(this.db, async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          return await this.db.transaction(async (manager) => {
            const requests = manager.getRepository(SolicitudSuscripcion);
            const existing = await requests.findOneBy(where);
            if (existing) return resolveExisting(existing);
            // Business rule: one live (activa/pausada) subscription per subscriber and box,
            // regardless of idempotency key. The database also enforces it for subscriptions.
            if (await manager.getRepository(Suscripcion).findOne({ where: {
              suscriptorId: input.suscriptorId, cajaMensualId: input.cajaMensualId, estado: In(['activa', 'pausada']),
            } })) throw new SolicitudConflictError('ALREADY_SUBSCRIBED', 'Ya existe una suscripción para esta caja');
            if (await requests.findOne({ where: {
              suscriptorId: input.suscriptorId, cajaMensualId: input.cajaMensualId, estado: In(['pendiente', 'procesando']),
            } })) throw new SolicitudConflictError('REQUEST_IN_PROGRESS', 'Ya hay un pedido en curso para esta caja');
            const boxes = manager.getRepository(CajaMensual).createQueryBuilder('box')
              .where('box.id = :id', { id: input.cajaMensualId });
            if (this.db.options.type === 'postgres') boxes.setLock('pessimistic_read');
            const box = await boxes.getOne();
            if (!box || !box.disponible || !box.tenantId) {
              throw new AppError('Caja no disponible', 404);
            }
            if (centavos(box.precioBase) !== confirmedCents) throw new SolicitudConflictError('PRICE_CHANGED', 'El precio cambió; revisá el pedido');
            const id = randomUUID();
            const createdAt = new Date();
            const solicitud = await requests.save(requests.create({ ...input, createdAt, updatedAt: createdAt, tenantId: box.tenantId, id, payloadHash, precioConfirmado: (confirmedCents / 100).toFixed(2), estado: 'pendiente' }));
            const messages = manager.getRepository(MensajeOutbox);
            await messages.save(messages.create({
              id: randomUUID(), solicitudId: id, tipo: 'subscription.requested', version: 1,
              contenido: JSON.stringify({ requestId: id, tenantId: box.tenantId }),
              estado: 'pendiente', intentos: 0, createdAt,
            }));
            return solicitud;
          });
        } catch (error) {
          // Concurrent inserts in another transaction may win the unique constraint.
          if (error instanceof QueryFailedError) {
            const driver = error.driverError as { code?: string };
            if (driver.code === '23505' || driver.code === 'SQLITE_CONSTRAINT') {
              const existing = await this.db.getRepository(SolicitudSuscripcion).findOneBy(where);
              if (existing) return resolveExisting(existing);
            }
            if (this.db.options.type === 'sqlite' && driver.code?.startsWith('SQLITE_BUSY') && attempt < 5) {
              await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
              continue;
            }
          }
          throw error;
        }
      }
    });
  }
}
