# LeyLine — Pendientes TP Segunda Parte

*Actualizado 2026-11-12, contra `main` (0bedb15)*

Esta lista es contra `docs/TP.md` (requisitos de la Segunda Parte) y el código real en `main`, ya con los merges de Stripe (`feature/pagos-stripe`) y el recomendador IA con DeepSeek.

**Ya cerrado, no tocar salvo bug:**
- SOAP de inventario (WSDL + `consultarInventario`/`reservarStock`/`actualizarInventario`), consumido desde el alta de suscripción.
- Routers REST documentados con OpenAPI/Swagger.
- Cola de mensajería real: RabbitMQ + patrón outbox/inbox en `modules/solicitudes-suscripcion`, con worker, reconciler de reintentos, migraciones y tests.
- Patrones Repository y Factory (`DatabaseFactory`) implementados de verdad, no solo nombrados.
- Auth JWT + multi-tenancy + RBAC.
- **Stripe como API externa (Pendiente 1 anterior, resuelto):** `StripePaymentStrategy` + `PaymentStrategyRegistry` (selección por `PAYMENT_PROVIDER`), webhook propio, reconciler de eventos de pago, migración, y wired de verdad en alta/pausa/reanudación/cancelación de suscripción y en el worker de la cola — no solo la interfaz Strategy. 28 casos de test (`test/payments.test.cjs`). Detalle y límites conocidos (tipo de cambio fijo, segundo cobro no probado contra Stripe real) en `docs/pagos-recurrentes.md`.
- **Componente de IA (Pendiente 2 anterior, resuelto — pero con un cambio de rumbo):** la rama `feature/ia` (Gemini/Gemma, con el admin advisor `SuggestCajaAdmin`) **no se mergeó** — quedó bloqueada por el modelo Gemma no respetando `responseMimeType: json` (devolvía razonamiento en texto plano, nunca el JSON). Lo que entró a `main` es una implementación distinta, con DeepSeek (`DeepSeekRecommendationClient`, API OpenAI-compatible con `response_format: json_object`, más confiable para esto): 3 endpoints reales — `recomendar`, `recomendar-general`, `recomendar-existentes` (esta última devuelve cajas ya creadas que calzan con el perfil del suscriptor, no una caja inventada). El advisor para admin de `feature/ia` quedó descartado, no hay que rescatarlo.

**Lo que falta es lo de abajo.**

## Pendiente 1 — Tests del componente de IA

TP.md pide explícitamente "evidencia de prueba del componente de IA" como parte del entregable de la Segunda Parte, y hoy no hay ninguno: ningún archivo de test referencia `recommend-caja-mensual`, `recommend-caja-mensual-general`, `recommend-cajas-existentes` ni `DeepSeekRecommendationClient`. Stripe sí tiene esto (28 casos); la IA no.

**Tareas:**
- [ ] Tests de los 3 use cases con el cliente DeepSeek mockeado (sin llamar a la API real): camino feliz, `DEEPSEEK_API_KEY` ausente (400), respuesta del modelo no parseable, suscriptor/caja inexistente.
- [ ] Al menos un test de `DeepSeekRecommendationClient.parsearJson` con una respuesta real capturada (positiva) para no depender de la red en CI.

## Pendiente 2 — Facade de orquestación

`SubscriptionPackFacade.activateSubscriptionAndPrepareFirstBox` (`common/patterns/facades/subscription-pack.facade.ts`) sigue devolviendo `ACTIVATION_PENDING_IMPLEMENTATION`, sin cambios desde la última revisión. Ya no tiene nada bloqueándolo — Stripe y el SOAP de inventario están disponibles — así que es puramente trabajo de cablear lo que ya existe:

- [ ] TODO 1 — Crear registro de suscripción (reusar `CreateSuscripcion`).
- [ ] TODO 2 — Validar inventario vía SOAP (reusar `InventarioSoapClient.consultarInventario`; ya existe, solo falta inyectarlo).
- [ ] TODO 3 — Ejecutar cobro recurrente vía Strategy → ya disponible (`createPaymentStrategy()`); el cobro real hoy ya ocurre en `ProcesarSolicitud`, el Facade solo necesita delegarle o replicar ese llamado.
- [ ] TODO 4 — Emitir evento de dominio para la orden de empaque → publicar directo a la cola RabbitMQ existente (recomendado) en vez del `EventDispatcher` en memoria, que sigue sin usarse (ver cabos sueltos).

## Cabos sueltos menores

- `reservarStock` y `actualizarInventario` (SOAP de inventario) siguen servidos pero sin ningún caller; se resuelve junto con el Facade (Pendiente 2).
- El `EventDispatcher` (Observer en memoria) sigue sin ningún `.subscribe()`/`.dispatch()` real; si el Facade va a publicar a RabbitMQ directamente, conviene borrar el `EventDispatcher` en vez de mantener dos mecanismos de eventos muertos en paralelo.
- La divergencia de ramas que causó el lío de la cola y del admin advisor de IA ya se resolvió sola (todo consolidado en `main`), pero vale la pena como lección: confirmar en el equipo que `main` es la única rama de trabajo de ahora en más, para no repetir el problema con el próximo feature grande.
