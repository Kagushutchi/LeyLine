import { createHash } from 'crypto';
import { DataSource, QueryFailedError } from 'typeorm';
import { PaymentEvent } from '../../../common/patterns/strategies/payment-strategy.interface';
import { logger } from '../../../common/utils/logger';
import { SolicitudSuscripcion } from '../../solicitudes-suscripcion/infrastructure/solicitud.entity';
import { MensajeOutbox } from '../../solicitudes-suscripcion/infrastructure/outbox.entity';
import { serializeSqlite } from '../../solicitudes-suscripcion/domain/sqlite-serialization';

export const PAYMENT_EVENT_TYPE = 'payment.event';

/** Id de mensaje determinístico por (proveedor, evento): una entrega repetida del webhook choca con la PK. */
export function paymentMessageId(provider: string, providerEventId: string): string {
  const hex = createHash('sha256').update(`${provider}:${providerEventId}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Productor: convierte un evento de pago verificado en un mensaje del outbox.
 * El webhook sólo registra y responde; el procesamiento ocurre en el consumidor de la cola.
 */
export class RegistrarEventoPago {
  constructor(private readonly db: DataSource) {}

  async execute(provider: string, event: PaymentEvent): Promise<'registrado' | 'duplicado' | 'ignorado'> {
    const request = await this.db.getRepository(SolicitudSuscripcion).findOneBy({ id: event.solicitudId });
    if (!request || request.paymentProvider !== provider) {
      logger.warn(`Evento de pago ${event.providerEventId} ignorado: solicitud desconocida o de otro proveedor`);
      return 'ignorado';
    }
    const messages = this.db.getRepository(MensajeOutbox);
    const id = paymentMessageId(provider, event.providerEventId);
    try {
      await serializeSqlite(this.db, () => messages.insert({
        id, solicitudId: request.id, tipo: PAYMENT_EVENT_TYPE, version: 1,
        contenido: JSON.stringify({ requestId: request.id, tenantId: request.tenantId, event }),
        estado: 'pendiente', intentos: 0,
      }));
      return 'registrado';
    } catch (error) {
      if (error instanceof QueryFailedError && await messages.findOneBy({ id })) return 'duplicado';
      throw error;
    }
  }
}
