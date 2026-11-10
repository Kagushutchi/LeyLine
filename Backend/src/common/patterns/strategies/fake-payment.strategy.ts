import { createHash, timingSafeEqual } from 'crypto';
import {
  IPaymentStrategy, PaymentEvent, PaymentEventKind, PaymentWebhookError, PlanData,
  StartSubscriptionInput, StartSubscriptionResult,
} from './payment-strategy.interface';

const KINDS: PaymentEventKind[] = ['payment.succeeded', 'payment.failed', 'subscription.canceled', 'checkout.expired'];

/**
 * Estrategia de pago determinística para desarrollo, demo y tests: no sale a la red.
 * El "proveedor" firma sus webhooks con un secreto compartido en el header `x-fake-signature`
 * y su cuerpo ya tiene la forma de un `PaymentEvent`.
 */
export class FakePaymentStrategy implements IPaymentStrategy {
  readonly providerName = 'fake';
  /** Permite a los tests simular caídas del proveedor. */
  failNextStart = false;
  readonly started: StartSubscriptionInput[] = [];

  constructor(private readonly webhookSecret = 'fake-webhook-secret', private readonly checkoutBaseUrl = 'http://localhost:3000/fake-checkout') {}

  async createSubscriptionPlan(plan: PlanData): Promise<string> {
    return `fake_plan_${createHash('sha256').update(plan.planKey).digest('hex').slice(0, 16)}`;
  }

  async startSubscription(input: StartSubscriptionInput): Promise<StartSubscriptionResult> {
    if (this.failNextStart) {
      this.failNextStart = false;
      throw new Error('fake provider unavailable');
    }
    this.started.push(input);
    // Determinístico por idempotencyKey, como un proveedor real.
    const id = createHash('sha256').update(input.idempotencyKey).digest('hex').slice(0, 24);
    return { providerSessionId: `fake_sess_${id}`, checkoutUrl: `${this.checkoutBaseUrl}/${id}` };
  }

  async cancelSubscription(): Promise<boolean> {
    return true;
  }

  async expireCheckout(): Promise<void> {}

  async createBillingPortalSession(providerSubscriptionId: string, returnUrl: string): Promise<string> {
    return `${this.checkoutBaseUrl}/portal/${providerSubscriptionId}?return=${encodeURIComponent(returnUrl)}`;
  }

  async pauseSubscription(): Promise<boolean> {
    return true;
  }

  async resumeSubscription(): Promise<boolean> {
    return true;
  }

  parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): PaymentEvent[] {
    const signature = headers['x-fake-signature'];
    const given = Buffer.from(typeof signature === 'string' ? signature : '');
    const expected = Buffer.from(this.webhookSecret);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new PaymentWebhookError('Firma de webhook inválida');
    }
    let body: any;
    try { body = JSON.parse(rawBody.toString('utf8')); } catch { throw new PaymentWebhookError('Cuerpo de webhook inválido'); }
    if (!body || typeof body.providerEventId !== 'string' || typeof body.solicitudId !== 'string' || !KINDS.includes(body.kind)) {
      return [];
    }
    return [{
      providerEventId: body.providerEventId, kind: body.kind, solicitudId: body.solicitudId,
      providerSubscriptionId: typeof body.providerSubscriptionId === 'string' ? body.providerSubscriptionId : undefined,
      providerCustomerId: typeof body.providerCustomerId === 'string' ? body.providerCustomerId : undefined,
      amountCents: Number.isSafeInteger(body.amountCents) ? body.amountCents : undefined,
      periodEnd: typeof body.periodEnd === 'string' ? body.periodEnd : undefined,
    }];
  }
}
