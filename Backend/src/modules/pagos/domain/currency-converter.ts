/** Resultado de convertir un importe: se persiste para poder auditar qué se cobró y con qué tipo de cambio. */
export interface Conversion {
  amountCents: number;
  from: string;
  to: string;
  /** Unidades de `from` por 1 unidad de `to` (1 si no hubo conversión). */
  rate: number;
}

/**
 * Convierte un importe en centavos de la moneda base a la moneda de cobro con un tipo de cambio fijo
 * (unidades de moneda base por 1 unidad de moneda de cobro). Redondea al centavo más cercano.
 */
export function convertAmount(amountCents: number, from: string, to: string, rate: number | null): Conversion {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Importe a convertir inválido');
  const source = from.toLowerCase();
  const target = to.toLowerCase();
  if (source === target) return { amountCents, from: source, to: target, rate: 1 };
  if (rate === null || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Falta PAYMENT_FX_RATE (${source.toUpperCase()} por 1 ${target.toUpperCase()}) para convertir ${source.toUpperCase()} a ${target.toUpperCase()}`);
  }
  const converted = Math.round(amountCents / rate);
  if (converted < 1) throw new Error('El importe convertido es menor a un centavo');
  return { amountCents: converted, from: source, to: target, rate };
}

/** Falla si hay que convertir de moneda y el tipo de cambio falta o es inválido. No depende de ningún importe. */
export function assertFxConfigured(from: string, to: string, rate: number | null): void {
  if (from.toLowerCase() === to.toLowerCase()) return;
  if (rate === null || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Falta PAYMENT_FX_RATE (${from.toUpperCase()} por 1 ${to.toUpperCase()}) para convertir ${from.toUpperCase()} a ${to.toUpperCase()}`);
  }
}
