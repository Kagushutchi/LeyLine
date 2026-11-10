import Stripe from 'stripe';
import {
  IPaymentStrategy, PaymentEvent, PaymentProviderError, PaymentWebhookError, PlanData,
  StartSubscriptionInput, StartSubscriptionResult,
} from './payment-strategy.interface';

/**
 * Adaptador de Stripe Billing a `IPaymentStrategy`.
 * Usa Checkout en modo `subscription`: Stripe aloja el formulario de pago y cobra cada período.
 * El dominio sólo ve eventos normalizados; ningún tipo de Stripe sale de esta clase.
 */
export class StripePaymentStrategy implements IPaymentStrategy {
  readonly providerName = 'stripe';
  private readonly stripe: Stripe;

  constructor(secretKey: string, private readonly webhookSecret: string, client?: Stripe) {
    if (!client && !secretKey) throw new Error('STRIPE_SECRET_KEY es requerida para PAYMENT_PROVIDER=stripe');
    this.stripe = client ?? new Stripe(secretKey, { timeout: 20000, maxNetworkRetries: 1 });
  }

  async createSubscriptionPlan(plan: PlanData): Promise<string> {
    try {
      const price = await this.stripe.prices.create({
        currency: plan.currency,
        unit_amount: plan.amountCents,
        recurring: { interval: 'month', interval_count: plan.intervalMonths },
        product_data: { name: plan.name },
        metadata: { planKey: plan.planKey },
      }, { idempotencyKey: `plan-${plan.planKey}` });
      return price.id;
    } catch (error) {
      throw new PaymentProviderError('Stripe: no se pudo crear el plan', error);
    }
  }

  async startSubscription(input: StartSubscriptionInput): Promise<StartSubscriptionResult> {
    const metadata = { solicitudId: input.solicitudId, tenantId: input.tenantId };
    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: input.providerPlanId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.solicitudId,
        ...(input.providerCustomerId ? { customer: input.providerCustomerId } : { customer_email: input.customerEmail }),
        metadata,
        subscription_data: { metadata },
        ...(input.expiresInMinutes ? { expires_at: Math.floor(Date.now() / 1000) + input.expiresInMinutes * 60 } : {}),
      }, { idempotencyKey: input.idempotencyKey });
      if (!session.url) throw new Error('Stripe no devolvió la URL de checkout');
      return { checkoutUrl: session.url, providerSessionId: session.id };
    } catch (error) {
      throw new PaymentProviderError('Stripe: no se pudo iniciar el checkout', error);
    }
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    try {
      const result = await this.stripe.subscriptions.cancel(providerSubscriptionId);
      return result.status === 'canceled';
    } catch (error) {
      throw new PaymentProviderError('Stripe: no se pudo cancelar la suscripción', error);
    }
  }

  async createBillingPortalSession(providerSubscriptionId: string, returnUrl: string): Promise<string> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(providerSubscriptionId);
      const customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      const session = await this.stripe.billingPortal.sessions.create({ customer, return_url: returnUrl });
      return session.url;
    } catch (error) {
      throw new PaymentProviderError('Stripe: no se pudo abrir el portal de facturación', error);
    }
  }

  async expireCheckout(providerSessionId: string): Promise<void> {
    try {
      await this.stripe.checkout.sessions.expire(providerSessionId);
    } catch (error) {
      throw new PaymentProviderError('Stripe: no se pudo expirar el checkout', error);
    }
  }

  async pauseSubscription(providerSubscriptionId: string): Promise<boolean> {
    try {
      // 'void': los períodos pausados no se cobran ni se acumulan.
      const result = await this.stripe.subscriptions.update(providerSubscriptionId, { pause_collection: { behavior: 'void' } });
      return result.pause_collection !== null;
    } catch (error) {
      throw new PaymentProviderError('Stripe: no se pudo pausar la suscripción', error);
    }
  }

  async resumeSubscription(providerSubscriptionId: string): Promise<boolean> {
    try {
      // Una cadena vacía quita la pausa.
      const result = await this.stripe.subscriptions.update(providerSubscriptionId, { pause_collection: '' });
      return result.pause_collection === null;
    } catch (error) {
      throw new PaymentProviderError('Stripe: no se pudo reanudar la suscripción', error);
    }
  }

  parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): PaymentEvent[] {
    const signature = headers['stripe-signature'];
    if (typeof signature !== 'string' || !this.webhookSecret) throw new PaymentWebhookError('Firma de webhook ausente');
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch {
      throw new PaymentWebhookError('Firma de webhook inválida');
    }
    return this.normalize(event);
  }

  /** Mapea eventos nativos a eventos de dominio. Los que no interesan se descartan. */
  private normalize(event: Stripe.Event): PaymentEvent[] {
    const object = event.data.object as any;
    switch (event.type) {
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        // Según la versión de API, los datos de la suscripción están en `parent` o en el nivel superior.
        const details = object.parent?.subscription_details ?? object.subscription_details ?? {};
        const solicitudId = details.metadata?.solicitudId ?? object.metadata?.solicitudId;
        if (!solicitudId) return [];
        const subscription = details.subscription ?? object.subscription;
        const periodEnd = object.lines?.data?.[0]?.period?.end;
        const customerId: string | undefined = typeof object.customer === 'string' ? object.customer : object.customer?.id;
        return [{
          providerEventId: event.id,
          kind: event.type === 'invoice.paid' ? 'payment.succeeded' : 'payment.failed',
          solicitudId,
          providerSubscriptionId: typeof subscription === 'string' ? subscription : subscription?.id,
          ...(customerId ? { providerCustomerId: customerId } : {}),
          amountCents: event.type === 'invoice.paid' ? object.amount_paid : object.amount_due,
          periodEnd: typeof periodEnd === 'number' ? new Date(periodEnd * 1000).toISOString() : undefined,
        }];
      }
      case 'customer.subscription.deleted': {
        const solicitudId = object.metadata?.solicitudId;
        if (!solicitudId) return [];
        return [{ providerEventId: event.id, kind: 'subscription.canceled', solicitudId, providerSubscriptionId: object.id }];
      }
      case 'checkout.session.expired': {
        const solicitudId = object.metadata?.solicitudId ?? object.client_reference_id;
        if (!solicitudId) return [];
        return [{ providerEventId: event.id, kind: 'checkout.expired', solicitudId }];
      }
      default:
        return [];
    }
  }
}
