/**
 * Patrón Strategy: Interfaz de Estrategia de Cobro Recurrente
 * Permite intercambiar dinámicamente proveedores (Stripe, MercadoPago, etc.).
 *
 * Reglas del contrato (para que un proveedor nuevo sea plug and play):
 *  - Los montos viajan siempre en centavos (enteros) con su moneda ISO-4217.
 *  - Los identificadores del proveedor (plan, sesión, suscripción) son opacos para el dominio.
 *  - El dominio nunca conoce los eventos nativos del proveedor: `parseWebhook` los normaliza.
 *  - El cobro recurrente lo ejecuta el proveedor (Billing); el dominio sólo se entera por eventos.
 */

export interface PlanData {
  /** Clave estable del plan en nuestro dominio (p. ej. `caja:<id>:<centavos>`). */
  planKey: string;
  name: string;
  amountCents: number;
  currency: string;
  intervalMonths: number;
}

export interface StartSubscriptionInput {
  /** Identificador del plan devuelto por `createSubscriptionPlan`. */
  providerPlanId: string;
  /** Misma clave => mismo resultado: los reintentos del worker no duplican el checkout. */
  idempotencyKey: string;
  /** Id de la solicitud de suscripción; el proveedor debe devolverlo en cada evento. */
  solicitudId: string;
  tenantId: string;
  /** Cliente ya creado en el proveedor para este suscriptor; si no existe se crea uno con `customerEmail`. */
  providerCustomerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  /** Minutos que el checkout sigue disponible antes de expirar (los proveedores suelen exigir un mínimo, p. ej. 30). */
  expiresInMinutes?: number;
}

export interface StartSubscriptionResult {
  /** URL a la que se redirige al suscriptor para completar el pago. */
  checkoutUrl: string;
  providerSessionId: string;
}

export type PaymentEventKind =
  | 'payment.succeeded'     // cobro (inicial o recurrente) aprobado
  | 'payment.failed'        // cobro rechazado
  | 'subscription.canceled' // el proveedor canceló la suscripción
  | 'checkout.expired';     // el suscriptor no completó el checkout

/** Evento de pago normalizado e independiente del proveedor. */
export interface PaymentEvent {
  /** Id del evento en el proveedor; se usa para deduplicar entregas repetidas. */
  providerEventId: string;
  kind: PaymentEventKind;
  solicitudId: string;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  amountCents?: number;
  /** Fin del período cubierto (ISO-8601), si el proveedor lo informa. */
  periodEnd?: string;
}

export interface IPaymentStrategy {
  readonly providerName: string;
  /** Crea (o recupera) el plan recurrente en el proveedor y devuelve su id. */
  createSubscriptionPlan(planData: PlanData): Promise<string>;
  startSubscription(input: StartSubscriptionInput): Promise<StartSubscriptionResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<boolean>;
  /** Detiene el cobro de nuevos períodos sin cancelar la suscripción. */
  pauseSubscription(providerSubscriptionId: string): Promise<boolean>;
  /** Retoma el cobro de una suscripción pausada. */
  resumeSubscription(providerSubscriptionId: string): Promise<boolean>;
  /**
   * Verifica la firma del webhook y devuelve los eventos normalizados.
   * Lanza `PaymentWebhookError` si la firma es inválida; devuelve `[]` si el evento no interesa.
   */
  /** URL de un portal alojado donde el cliente actualiza su medio de pago y ve sus facturas. */
  createBillingPortalSession(providerSubscriptionId: string, returnUrl: string): Promise<string>;
  /** Invalida un checkout que el suscriptor ya no va a completar. Falla si ya se pagó. */
  expireCheckout(providerSessionId: string): Promise<void>;
  parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): PaymentEvent[];
}

export class PaymentWebhookError extends Error {}

export class PaymentProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
  }
}
