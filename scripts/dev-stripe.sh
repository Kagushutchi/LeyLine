#!/usr/bin/env bash
# Reenvía los webhooks de Stripe a la API local, pero sólo si PAYMENT_PROVIDER=stripe.
# Con `fake` o `none` no hace falta: no sale nada a la red.
set -uo pipefail

ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/Backend/.env"

# Lee una variable del .env sin ejecutarlo ni imprimir secretos (descarta comentarios al final de línea).
env_value() {
  [ -f "$ENV_FILE" ] || return 0
  grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -E 's/[[:space:]]+#.*$//; s/^[[:space:]]+|[[:space:]]+$//g'
}

PROVIDER="$(env_value PAYMENT_PROVIDER)"
PORT="$(env_value PORT)"
PORT="${PORT:-3000}"

if [ "${PROVIDER:-none}" != "stripe" ]; then
  echo "PAYMENT_PROVIDER=${PROVIDER:-none}: no se necesita 'stripe listen'. (Para probar Stripe: PAYMENT_PROVIDER=stripe en Backend/.env)"
  exit 0
fi

if ! command -v stripe >/dev/null 2>&1; then
  echo "ERROR: falta el Stripe CLI. Instalalo con: brew install stripe/stripe-cli/stripe  y corré: stripe login" >&2
  exit 1
fi

# El secreto de firma de `stripe listen` tiene que coincidir con STRIPE_WEBHOOK_SECRET o los webhooks dan 400.
EXPECTED="$(env_value STRIPE_WEBHOOK_SECRET)"
ACTUAL="$(stripe listen --print-secret 2>/dev/null | tr -d '[:space:]')"
if [ -z "$ACTUAL" ]; then
  echo "ERROR: no pude obtener el secreto del Stripe CLI. ¿Hiciste 'stripe login'?" >&2
  exit 1
fi
if [ "$ACTUAL" != "$EXPECTED" ]; then
  echo "ATENCIÓN: STRIPE_WEBHOOK_SECRET en Backend/.env NO coincide con el de 'stripe listen'." >&2
  echo "          Los webhooks van a fallar con 400. Copiá este valor al .env y reiniciá la API y el worker:" >&2
  echo "          STRIPE_WEBHOOK_SECRET=$ACTUAL" >&2
fi

# Sólo los eventos que procesa el backend (ver StripePaymentStrategy.normalize); el CLI nuevo exige indicarlos.
EVENTS="invoice.paid,invoice.payment_failed,customer.subscription.deleted,checkout.session.expired,checkout.session.completed"
exec stripe listen --events "$EVENTS" --forward-to "localhost:${PORT}/api/webhooks/payments"
