import { logger } from '../../utils/logger';
import { AppError } from '../../errors/app-error';
import { getDataSource } from '../../../config/database.config';
import { envConfig } from '../../../config/env.config';
import CreateSuscripcion from '../../../modules/suscripciones/domain/useCase/create-suscripcion';
import { Suscriptor } from '../../../modules/suscriptores/infrastructure/suscriptor.entity';
import { CajaMensual } from '../../../modules/cajas-mensuales/infrastructure/caja-mensual.entity';
import { ClientePago } from '../../../modules/pagos/infrastructure/cliente-pago.entity';
import { ensurePlan } from '../../../modules/pagos/domain/plan-catalog';
import { convertAmount } from '../../../modules/pagos/domain/currency-converter';
import { centavos } from '../../../modules/solicitudes-suscripcion/domain/aceptar-solicitud';
import { createPaymentStrategy } from '../strategies/payment-strategy.registry';
import { EventDispatcher } from '../events/event-dispatcher';
import { InventarioSoapClient } from '../../../modules/inventario/client/inventario-soap-client';

export const SUSCRIPCION_ACTIVADA_EVENT = 'SuscripcionActivada';

export interface SuscripcionActivadaPayload {
  suscripcionId: string;
  subscriberId: string;
  planId: string;
  composiciones: Array<{ productoId: string; cantidad: number }>;
}

export interface ActivationResult {
  /** 'ACTIVATED': alta sin cobro (PAYMENT_PROVIDER=none). 'ACTIVATED_AWAITING_PAYMENT': el suscriptor debe completar el checkout. */
  status: 'ACTIVATED' | 'ACTIVATED_AWAITING_PAYMENT';
  subscriberId: string;
  planId: string;
  suscripcionId: string;
  checkoutUrl?: string;
}

/**
 * Patrón Observer: handler real de `SuscripcionActivada`, registrado una sola vez.
 * Reserva stock por SOAP para cada producto de la primera caja — el mismo rol que tendría
 * una "orden de empaque" para la bodega/tostadero asociado.
 *
 * Se registra fuera de la clase (no en el constructor) para no duplicar la suscripción al
 * EventDispatcher —que es un singleton— cada vez que se instancia el Facade.
 */
let listenerRegistrado = false;
export function registerPackagingListener(dispatcher: EventDispatcher = EventDispatcher.getInstance()): void {
  if (listenerRegistrado) return;
  listenerRegistrado = true;

  dispatcher.subscribe<SuscripcionActivadaPayload>(SUSCRIPCION_ACTIVADA_EVENT, async (event) => {
    const inventario = new InventarioSoapClient();
    for (const composicion of event.payload.composiciones) {
      try {
        const reserva = await inventario.reservarStock(composicion.productoId, composicion.cantidad);
        if (!reserva.exito) {
          logger.error(
            `[Facade] No se pudo reservar stock para el producto ${composicion.productoId} ` +
              `de la suscripción ${event.payload.suscripcionId}: ${reserva.mensaje}`
          );
        }
      } catch (error) {
        // Un producto sin stock o con el servicio SOAP caído no debe tirar abajo la reserva del resto.
        const message = error instanceof Error ? error.message : String(error);
        logger.error(
          `[Facade] Error reservando stock para el producto ${composicion.productoId} ` +
            `de la suscripción ${event.payload.suscripcionId}: ${message}`
        );
      }
    }
  });
}

/**
 * Patrón Facade: Fachada de Orquestación de Membresía y Empaque.
 * Ofrece una interfaz única y de alto nivel sobre varios subsistemas (Suscripciones, SOAP de
 * inventario, Strategy de pagos y Observer de eventos de dominio) para activar una suscripción
 * y disparar la preparación de su primera caja.
 *
 * Es un camino alternativo al flujo asincrónico basado en cola (`solicitudes-suscripcion` +
 * `ProcesarSolicitud`), pensado para una activación directa (p. ej. desde un panel de admin o un
 * demo) que no necesita pasar por la cola de solicitudes. Reusa los mismos componentes reales
 * (`CreateSuscripcion`, `createPaymentStrategy`, `ensurePlan`, `convertAmount`) en vez de
 * reimplementar su lógica.
 */
export class SubscriptionPackFacade {
  constructor(private readonly dispatcher: EventDispatcher = EventDispatcher.getInstance()) {
    registerPackagingListener(this.dispatcher);
  }

  /**
   * Orquesta el flujo completo de activación de suscripción y despacho mensual inicial.
   */
  public async activateSubscriptionAndPrepareFirstBox(
    subscriberId: string,
    planId: string
  ): Promise<ActivationResult> {
    logger.info(`[Facade] Orquestando activación y primer envío para suscriptor ${subscriberId}`);

    const caja = await getDataSource().getRepository(CajaMensual).findOne({
      where: { id: planId },
      relations: { composiciones: true },
    });
    if (!caja) {
      throw new AppError(`Caja mensual (plan) con ID ${planId} no encontrada`, 404);
    }

    // 1. Crear registro de suscripción y 2. validar inventario disponible vía SOAP:
    // CreateSuscripcion ya hace ambas cosas (verifyStock consulta InventarioSoapClient internamente).
    const suscripcion = await new CreateSuscripcion().execute({
      suscriptorId: subscriberId,
      cajaMensualId: planId,
      montoMensual: caja.precioBase,
    });

    // 3. Ejecutar cobro recurrente inicial vía Strategy (si hay un proveedor configurado).
    const checkoutUrl = await this.startPaymentIfConfigured(subscriberId, suscripcion.id, caja);

    // 4. Emitir evento de dominio para la orden de empaque (Observer).
    await this.dispatcher.dispatch<SuscripcionActivadaPayload>({
      eventName: SUSCRIPCION_ACTIVADA_EVENT,
      occurredOn: new Date(),
      payload: {
        suscripcionId: suscripcion.id,
        subscriberId,
        planId,
        composiciones: (caja.composiciones ?? []).map((composicion) => ({
          productoId: composicion.productoId,
          cantidad: composicion.cantidad,
        })),
      },
    });

    return {
      status: checkoutUrl ? 'ACTIVATED_AWAITING_PAYMENT' : 'ACTIVATED',
      subscriberId,
      planId,
      suscripcionId: suscripcion.id,
      ...(checkoutUrl ? { checkoutUrl } : {}),
    };
  }

  private async startPaymentIfConfigured(
    subscriberId: string,
    suscripcionId: string,
    caja: CajaMensual
  ): Promise<string | undefined> {
    const strategy = createPaymentStrategy();
    if (!strategy) return undefined;

    const amountCents = centavos(caja.precioBase);
    if (amountCents === null) {
      throw new AppError('El precio de la caja mensual es inválido para iniciar el cobro', 500);
    }

    const suscriptor = await getDataSource().getRepository(Suscriptor).findOneByOrFail({ id: subscriberId });
    const { baseCurrency, currency, fxRate, checkoutTtlMinutes, successUrl, cancelUrl } = envConfig.payments;
    const charge = convertAmount(amountCents, baseCurrency, currency, fxRate);
    const providerPlanId = await ensurePlan(getDataSource(), strategy, {
      box: caja,
      amountCents: charge.amountCents,
      currency: charge.to,
    });
    const known = await getDataSource()
      .getRepository(ClientePago)
      .findOneBy({ provider: strategy.providerName, suscriptorId: subscriberId });

    const started = await strategy.startSubscription({
      providerPlanId,
      idempotencyKey: `facade-activation-${suscripcionId}`,
      solicitudId: suscripcionId,
      tenantId: caja.tenantId ?? '',
      providerCustomerId: known?.providerCustomerId,
      customerEmail: suscriptor.email,
      successUrl,
      cancelUrl,
      expiresInMinutes: checkoutTtlMinutes,
    });

    return started.checkoutUrl;
  }
}
