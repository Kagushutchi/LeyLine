import { DataSource } from 'typeorm';
import { AppError } from '../../../common/errors/app-error';
import { IPaymentStrategy } from '../../../common/patterns/strategies/payment-strategy.interface';
import { SolicitudSuscripcion } from '../infrastructure/solicitud.entity';
import { serializeSqlite } from './sqlite-serialization';

/**
 * El suscriptor abandona un pedido que espera el pago: se invalida el checkout en el proveedor y la solicitud
 * pasa a `expirado`, liberando la caja para pedirla de nuevo sin esperar a que el checkout expire solo.
 */
export class DescartarSolicitud {
  constructor(private readonly db: DataSource, private readonly payments: IPaymentStrategy | null) {}

  async execute(input: { requestId: string; principalId: string; suscriptorId: string }): Promise<SolicitudSuscripcion> {
    const requests = this.db.getRepository(SolicitudSuscripcion);
    const request = await requests.findOneBy({ id: input.requestId, principalId: input.principalId, suscriptorId: input.suscriptorId });
    if (!request) throw new AppError('Solicitud no encontrada', 404);
    if (request.estado === 'expirado') return request; // idempotente
    if (request.estado !== 'esperando_pago') {
      throw new AppError(`Solo se puede descartar un pedido que espera el pago (estado actual: ${request.estado})`, 409);
    }

    if (request.providerSessionId) {
      if (!this.payments || this.payments.providerName !== request.paymentProvider) {
        throw new AppError('El proveedor de pago de esta solicitud no está disponible', 503);
      }
      try {
        await this.payments.expireCheckout(request.providerSessionId);
      } catch {
        // Típico: el checkout ya se pagó (el webhook está en camino). No se descarta un pedido pagado.
        throw new AppError('No se pudo descartar el pedido: el pago ya se completó o el proveedor no responde', 409);
      }
    }

    await serializeSqlite(this.db, () => requests.update({ id: request.id, estado: 'esperando_pago' }, { estado: 'expirado' }));
    return requests.findOneByOrFail({ id: request.id });
  }
}
