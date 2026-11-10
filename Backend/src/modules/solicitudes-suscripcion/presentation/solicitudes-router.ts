import { NextFunction, Request, Response, Router } from 'express';
import { DataSource } from 'typeorm';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import { AppError } from '../../../common/errors/app-error';
import { User } from '../../auth/infrastructure/user.entity';
import { Suscriptor } from '../../suscriptores/infrastructure/suscriptor.entity';
import { AceptarSolicitud, SolicitudConflictError } from '../domain/aceptar-solicitud';
import { SolicitudSuscripcion } from '../infrastructure/solicitud.entity';
import { DescartarSolicitud } from '../domain/descartar-solicitud';
import { IPaymentStrategy } from '../../../common/patterns/strategies/payment-strategy.interface';

const publicRequest = (request: SolicitudSuscripcion) => ({
  id: request.id, cajaMensualId: request.cajaMensualId,
  estado: request.estado, suscripcionId: request.suscripcionId,
  ...(request.checkoutUrl ? { checkoutUrl: request.checkoutUrl } : {}),
  ...(request.chargeAmountCents != null && request.chargeCurrency
    ? { cobro: { monto: (request.chargeAmountCents / 100).toFixed(2), moneda: request.chargeCurrency.toUpperCase() } } : {}),
  createdAt: request.createdAt, updatedAt: request.updatedAt,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_WAIT_MS = 5000, WAIT_STEP_MS = 75, MAX_WAITERS = 200;
let waiters = 0;
// El long-poll también corta en 'esperando_pago': el cliente necesita la URL de checkout.
const isTerminalState = (state: string) => ['completado', 'rechazado', 'fallido', 'expirado', 'esperando_pago'].includes(state);

/** Mounted only when SUBSCRIPTION_REQUESTS_ENABLED=true; not the relay and worker are operational. */
export function createSolicitudesRouter(db: DataSource, payments: IPaymentStrategy | null = null): Router {
  const router = Router();
  router.use(authMiddleware);

  async function identity(req: Request): Promise<{ principalId: string; suscriptorId: string }> {
    const user = await db.getRepository(User).findOneBy({ id: req.user!.userId });
    if (!user || !user.activo) throw new AppError('Usuario no autorizado', 403);
    if (user.role !== 'subscriptor') throw new AppError('Usuario no autorizado', 403);
    if (!user.suscriptorId) throw new AppError('No existe un suscriptor vinculado', 403);
    const subscriber = await db.getRepository(Suscriptor).findOneBy({ id: user.suscriptorId, activo: true });
    if (!subscriber) throw new AppError('No existe un suscriptor vinculado', 403);
    return { principalId: user.id, suscriptorId: subscriber.id };
  }

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const principal = await identity(req);
      const key = req.header('Idempotency-Key');
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)
        || Object.keys(body).some((field) => field !== 'cajaMensualId' && field !== 'precioConfirmadoCentavos')
        || typeof body.cajaMensualId !== 'string' || !UUID.test(body.cajaMensualId) || !key
        || !Number.isSafeInteger(body.precioConfirmadoCentavos) || body.precioConfirmadoCentavos <= 0) {
        throw new AppError('Datos de solicitud inválidos', 400);
      }
      const request = await new AceptarSolicitud(db).execute({
        ...principal, cajaMensualId: body.cajaMensualId, idempotencyKey: key,
        precioConfirmadoCentavos: body.precioConfirmadoCentavos,
      });
      res.location(`/api/solicitudes-suscripcion/${encodeURIComponent(request.id)}`)
        .status(202).json({ status: 'success', data: publicRequest(request) });
    } catch (error) {
      if (error instanceof SolicitudConflictError) {
        const messages: Record<string, string> = {
          PRICE_CHANGED: 'El precio cambió; revisá el pedido',
          IDEMPOTENCY_KEY_CONFLICT: 'La clave de idempotencia ya fue utilizada con otros datos',
          ALREADY_SUBSCRIBED: 'Ya tenés una suscripción para esta caja',
          REQUEST_IN_PROGRESS: 'Ya hay un pedido en curso para esta caja',
        };
        const message = messages[error.code];
        res.status(409).json({ status: 'error', code: error.code, message });
        return;
      }
      next(error);
    }
  });

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const principal = await identity(req);
      const requests = await db.getRepository(SolicitudSuscripcion).find({
        where: principal, order: { createdAt: 'DESC' },
      });
      res.json({ status: 'success', data: requests.map(publicRequest) });
    } catch (error) { next(error); }
  });

  router.post('/:id/cancelar', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const principal = await identity(req);
      if (!UUID.test(req.params.id)) throw new AppError('Solicitud no encontrada', 404);
      const request = await new DescartarSolicitud(db, payments).execute({ requestId: req.params.id, ...principal });
      res.json({ status: 'success', data: publicRequest(request) });
    } catch (error) { next(error); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const principal = await identity(req);
      const repository = db.getRepository(SolicitudSuscripcion);
      if (!UUID.test(req.params.id)) throw new AppError('Solicitud no encontrada', 404);
      let request = await repository.findOneBy({ id: req.params.id, ...principal });
      if (!request) throw new AppError('Solicitud no encontrada', 404);
      // Long-poll: ?waitMs=N holds the response until the request is terminal (or N ms pass),
      // so the UI sees the result as soon as the worker finishes instead of on its next poll.
      const waitMs = Math.min(Math.max(Number(req.query?.waitMs) || 0, 0), MAX_WAIT_MS);
      if (waitMs > 0 && !isTerminalState(request.estado) && waiters < MAX_WAITERS) {
        let closed = false;
        req.on?.('close', () => { closed = true; });
        waiters++;
        try {
          const deadline = Date.now() + waitMs;
          while (!closed && !isTerminalState(request.estado) && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS));
            request = (await repository.findOneBy({ id: req.params.id, ...principal })) ?? request;
          }
        } finally { waiters--; }
      }
      res.json({ status: 'success', data: publicRequest(request) });
    } catch (error) { next(error); }
  });
  return router;
}
