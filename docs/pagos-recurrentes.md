# Pagos recurrentes (Strategy + cola de suscripciones)

Cobro de suscripciones mediante un proveedor intercambiable (`IPaymentStrategy`), integrado al flujo de la cola
`subscription.requested`. Con `PAYMENT_PROVIDER=none` (por defecto) el flujo anterior no cambia: la suscripción se crea sin cobro.

## Flujo

```
POST /api/solicitudes-suscripcion  ──► solicitud 'pendiente' + outbox(subscription.requested)
        relay ► RabbitMQ ► ProcesarSolicitud
                              valida ► 'procesando' ► strategy.startSubscription()  (fuera de la transacción de BD)
                              ► 'esperando_pago' + checkoutUrl           ◄── el cliente hace GET de la solicitud y redirige
Proveedor cobra ► webhook POST /api/webhooks/payments (firma verificada, cuerpo crudo)
                              ► strategy.parseWebhook() ► PaymentEvent normalizado ► outbox(payment.event)
        relay ► RabbitMQ ► ProcesarPago
                              payment.succeeded (inicial) ► crea Suscripcion 'activa' + solicitud 'completado'
                              payment.succeeded (recurrente) ► actualiza proximoCobro
                              payment.failed    ► pausa la suscripción
                              subscription.canceled ► 'cancelada'
                              checkout.expired  ► solicitud 'expirado'
```

Estados de la solicitud: `pendiente → procesando → esperando_pago → completado | expirado`, más `rechazado` y `fallido` (ya existentes).
Una solicitud en `esperando_pago` bloquea nuevos pedidos para la misma caja hasta completarse o expirar.

## Moneda y conversión

Los precios de las cajas están en **pesos** (`PAYMENT_BASE_CURRENCY=ARS`); el proveedor cobra en `PAYMENT_CURRENCY` (p. ej. `USD`) al
tipo de cambio fijo `PAYMENT_FX_RATE` (unidades de moneda base por 1 de cobro: `1200` = 1200 ARS por 1 USD). Si las monedas difieren y
falta el tipo de cambio, el worker **no arranca**. La conversión (redondeo al centavo) se hace al crear el checkout, y se guarda en la
solicitud el importe cobrado, su moneda y el tipo de cambio aplicado (`cobro` en la API, auditoría en la base). La suscripción conserva
su `montoMensual` en pesos. El plan del proveedor se cachea por importe convertido: un cambio de tipo de cambio crea un plan nuevo para
las compras siguientes; las suscripciones existentes siguen cobrando el importe en dólares con el que se contrataron.

## Garantías

- **Sin doble cobro**: la idempotency key hacia el proveedor es `subscription-request-<solicitudId>`; un reintento del worker reutiliza el checkout.
- **Sin eventos duplicados**: el id del mensaje del outbox es determinístico por `(proveedor, providerEventId)`; una entrega repetida del webhook choca con la clave primaria. El inbox (`payment-event-v1`) deduplica el consumo.
- **Recuperación**: si el proveedor falla, la solicitud vuelve a `pendiente` y entra al reintento durable existente. Si el proceso cae con la solicitud en `procesando`, el `RetryReconciler` la recupera.
- **Eventos de pago perdidos**: el `PaymentEventReconciler` (en el worker) republica los `payment.event` que se publicaron pero nunca se
  consumieron (fueron a la cola de mensajes muertos). Es seguro por el inbox; tras 5 intentos queda `fallido` en el outbox y requiere revisión.
- **Cobro rechazado**: pausa la suscripción con `pausadaPorPago`; el siguiente cobro exitoso la reactiva sola, y el suscriptor no puede
  reanudarla a mano (409). Para pagar de nuevo usa el portal (`POST /api/suscripciones/:id/portal`).
- **Sin alta sin pago**: con `PAYMENT_PROVIDER` distinto de `none`, `POST /api/suscripciones` es sólo para admin (403 al suscriptor).
- **Checkout abandonado**: vence a los `PAYMENT_CHECKOUT_TTL_MINUTES` (30 por defecto) y el suscriptor puede descartarlo antes con
  `POST /api/solicitudes-suscripcion/:id/cancelar` (invalida el checkout y libera la caja). Si el checkout ya se pagó, no se descarta (409).
- **Cliente reutilizado**: el cliente del proveedor se guarda por suscriptor (`clientes_pago`) y se reutiliza en las compras siguientes.
- **Cancelación**: `CancelSuscripcion` cancela primero en el proveedor; si éste falla responde 502 y la suscripción sigue activa.
- **Agnosticismo**: el dominio sólo guarda `paymentProvider` y `providerSubscriptionId` (opacos) y consume `PaymentEvent` normalizados.

## Configuración

| Variable | Descripción |
|---|---|
| `PAYMENT_PROVIDER` | `none` (default), `fake`, `stripe` |
| `PAYMENT_CURRENCY`, `PAYMENT_SUCCESS_URL`, `PAYMENT_CANCEL_URL` | Moneda y redirecciones del checkout |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Claves de **test** de Stripe |
| `FAKE_PAYMENT_WEBHOOK_SECRET` | Secreto del proveedor simulado |

Requiere `SUBSCRIPTION_REQUESTS_ENABLED=true` en la API y `QUEUE_RUNTIME_ENABLED=true` en el worker (ver `runbook-colas-suscripciones.md`).
Tanto la API como el worker deben tener el mismo `PAYMENT_PROVIDER`.

## Frontend

`CatalogoView` (suscriptor) sigue el mismo flujo con `VITE_SUBSCRIPTION_REQUESTS_ENABLED=true`:

1. "Suscribirme" → confirmación → `POST /api/solicitudes-suscripcion`.
2. El frontend hace long-poll de la solicitud; cuando pasa a `esperando_pago` redirige a su `checkoutUrl` (sólo URLs http/https válidas).
3. Tras pagar, el proveedor vuelve a `PAYMENT_SUCCESS_URL` / `PAYMENT_CANCEL_URL` (por defecto `/catalogo?pago=exito|cancelado`),
   se muestra un aviso y el polling existente detecta `completado` y refresca las membresías.
4. Si el suscriptor abandona el pago, la solicitud queda en "Mis solicitudes" con el botón "Completar el pago" hasta que expire.

## Entorno de desarrollo

`docker compose up --build` (o `npm run up`) levanta todo en contenedores: ver README, sección "Todo en Docker". Con `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY` debe ser `sk_test_...` o una clave restringida con el permiso *Debugging Tools: Write* (si no, Stripe rechaza `stripe listen`).

Sin Docker para la aplicación:

`npm run dev` en la raíz levanta infraestructura, API, worker, `stripe listen` y frontend (ver README).

## Agregar un proveedor

1. Implementar `IPaymentStrategy` (`startSubscription`, `cancelSubscription`, `createSubscriptionPlan`, `parseWebhook`); `parseWebhook` verifica la firma y devuelve `PaymentEvent[]`, incluyendo `solicitudId` (enviarlo como metadata al crear el checkout/suscripción).
2. Registrarlo en `payment-strategy.registry.ts`.
3. Nada más cambia: cola, consumidores, entidades y cancelación son agnósticos.

## Prueba manual con Stripe (modo test)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/payments   # imprime STRIPE_WEBHOOK_SECRET
# API y worker con PAYMENT_PROVIDER=stripe, STRIPE_SECRET_KEY=sk_test_..., STRIPE_WEBHOOK_SECRET=whsec_...
# 1) POST /api/solicitudes-suscripcion  → 202
# 2) GET  /api/solicitudes-suscripcion/:id?waitMs=5000 → estado 'esperando_pago' + checkoutUrl
# 3) Abrir checkoutUrl y pagar con la tarjeta 4242 4242 4242 4242
# 4) GET de la solicitud → 'completado'; la suscripción queda 'activa' con providerSubscriptionId
```

Tests automatizados: `Backend/test/payments.test.cjs` (Fake y Stripe con cliente simulado).
