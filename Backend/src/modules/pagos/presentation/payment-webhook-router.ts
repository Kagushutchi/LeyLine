import { NextFunction, Request, Response, Router } from 'express';
import { DataSource } from 'typeorm';
import { IPaymentStrategy, PaymentWebhookError } from '../../../common/patterns/strategies/payment-strategy.interface';
import { RegistrarEventoPago } from '../domain/registrar-evento-pago';

/**
 * Receptor de webhooks del proveedor de pago activo. Debe montarse con `express.raw`
 * (la firma se calcula sobre el cuerpo exacto) y sin autenticación JWT: la firma es la autenticación.
 * Sólo verifica, normaliza y registra el evento en el outbox; responde rápido para que el proveedor no reintente.
 */
export function createPaymentWebhookRouter(db: DataSource, strategy: IPaymentStrategy): Router {
  const router = Router();
  const producer = new RegistrarEventoPago(db);

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ status: 'error', message: 'Cuerpo de webhook inválido' });
      return;
    }
    try {
      const events = strategy.parseWebhook(req.body, req.headers);
      const results = [];
      for (const event of events) results.push(await producer.execute(strategy.providerName, event));
      res.status(200).json({ received: true, events: results.length });
    } catch (error) {
      if (error instanceof PaymentWebhookError) {
        res.status(400).json({ status: 'error', message: error.message });
        return;
      }
      next(error);
    }
  });

  return router;
}
