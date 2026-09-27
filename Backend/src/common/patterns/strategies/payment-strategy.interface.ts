/**
 * Patrón Strategy: Interfaz de Estrategia de Cobro Recurrente
 * Permite intercambiar dinámicamente proveedores (Stripe, MercadoPago, etc.)
 */
export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

export interface IPaymentStrategy {
  readonly providerName: string;
  createSubscriptionPlan(planData: { name: string; amount: number; intervalMonths: number }): Promise<string>;
  processRecurringPayment(subscriptionId: string, amount: number): Promise<PaymentResult>;
  cancelSubscription(subscriptionId: string): Promise<boolean>;
}
