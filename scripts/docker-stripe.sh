#!/bin/sh
# Corre dentro del contenedor `stripe` (imagen stripe/stripe-cli): reenvía los webhooks a la API.
# Se activa sólo con PAYMENT_PROVIDER=stripe; con fake/none termina sin error y el resto sigue.
set -u

if [ "${PAYMENT_PROVIDER:-none}" != "stripe" ]; then
  echo "PAYMENT_PROVIDER=${PAYMENT_PROVIDER:-none}: no se necesita stripe listen."
  exit 0
fi
if [ -z "${STRIPE_SECRET_KEY:-}" ]; then
  echo "ERROR: falta STRIPE_SECRET_KEY en Backend/.env" >&2
  exit 1
fi

export STRIPE_API_KEY="$STRIPE_SECRET_KEY"

# El secreto de firma de `stripe listen` debe coincidir con STRIPE_WEBHOOK_SECRET o los webhooks dan 400.
ACTUAL="$(stripe listen --print-secret 2>/dev/null | tr -d '[:space:]')"
if [ -z "$ACTUAL" ]; then
  echo "ERROR: no pude obtener el secreto de firma con STRIPE_SECRET_KEY." >&2
  echo "       Con una clave restringida (rk_test_...) habilitá el permiso 'Debugging Tools: Write' en el dashboard de Stripe," >&2
  echo "       o usá una clave sk_test_... (Developers > API keys, modo de prueba)." >&2
  exit 1
fi
if [ "$ACTUAL" != "${STRIPE_WEBHOOK_SECRET:-}" ]; then
  echo "ATENCIÓN: STRIPE_WEBHOOK_SECRET en Backend/.env NO coincide con el de stripe listen." >&2
  echo "          Los webhooks van a fallar con 400. Poné este valor en Backend/.env y reiniciá api y worker:" >&2
  echo "          STRIPE_WEBHOOK_SECRET=$ACTUAL" >&2
fi

EVENTS="invoice.paid,invoice.payment_failed,customer.subscription.deleted,checkout.session.expired,checkout.session.completed"
exec stripe listen --events "$EVENTS" --forward-to "http://api:3000/api/webhooks/payments"
