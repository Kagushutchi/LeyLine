/** Only stable backend error codes allow an ambiguous attempt to be discarded. */
export type SubmissionFailure = 'price-changed' | 'already-subscribed' | 'in-progress' | 'conflict' | 'rejected' | 'uncertain';
export type DraftBlock = 'conflict' | 'rejected';
export function blockForFailure(failure: SubmissionFailure): DraftBlock | undefined {
  return failure === 'conflict' || failure === 'rejected' ? failure : undefined;
}
export function classifySubmissionFailure(error: unknown): SubmissionFailure {
  const response = (error as { response?: { status?: number; data?: { code?: string } } })?.response;
  if (!response) return 'uncertain';
  if (response.status === 409 && response.data?.code === 'PRICE_CHANGED') return 'price-changed';
  if (response.status === 409 && response.data?.code === 'ALREADY_SUBSCRIBED') return 'already-subscribed';
  if (response.status === 409 && response.data?.code === 'REQUEST_IN_PROGRESS') return 'in-progress';
  if (response.status === 409) return 'conflict';
  if (response.status && response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) return 'rejected';
  return 'uncertain';
}

/** Sólo se redirige a URLs http(s) bien formadas; cualquier otra cosa (javascript:, data:, vacío) se descarta. */
export function safeCheckoutUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * ¿Hay algo que el servidor esté resolviendo y valga la pena consultar seguido?
 * `esperando_pago` NO cuenta: depende del suscriptor (que puede abandonar el checkout), no del servidor.
 * Sólo cuenta durante la ventana posterior a volver del pago (`awaitingPaymentUntil`), para detectar la activación.
 */
export function hasInFlightRequest(items: { estado: string }[], now: number, awaitingPaymentUntil: number): boolean {
  return items.some(item => item.estado === 'pendiente' || item.estado === 'procesando'
    || (item.estado === 'esperando_pago' && now < awaitingPaymentUntil));
}

/** Frecuencia de consulta según cuánto lleva abierto el pedido: rápido al principio, más espaciado después. */
export function pollDelayForAge(ageMs: number): number {
  return ageMs < 10000 ? 1000 : ageMs < 30000 ? 3000 : 10000;
}

/**
 * Formatea una fecha del backend. Las fechas "solo día" (`2026-12-09`) se interpretan como día calendario local:
 * `new Date('2026-12-09')` es medianoche UTC y en Argentina (UTC-3) se mostraría como el 8.
 */
export function formatDay(value: string | Date | null | undefined, locale = 'es-AR'): string {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T00:00:00(?:\.0+)?Z?$)/.exec(value);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString(locale);
  }
  return new Date(value).toLocaleDateString(locale);
}

/** "12,08 USD" para el total a pagar. */
export function formatCharge(cobro: { monto: string; moneda: string } | undefined, locale = 'es-AR'): string {
  if (!cobro) return '';
  return `${Number(cobro.monto).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cobro.moneda}`;
}
