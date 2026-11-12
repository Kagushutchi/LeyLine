# LeyLine — Pendientes TP Segunda Parte

*Actualizado 2026-11-12, contra `main` (0bedb15)*

Esta lista es contra `docs/TP.md` (requisitos de la Segunda Parte) y el código real en `main`, ya con los merges de Stripe (`feature/pagos-stripe`) y el recomendador IA con DeepSeek.

**Ya cerrado, no tocar salvo bug:**
- SOAP de inventario (WSDL + `consultarInventario`/`reservarStock`/`actualizarInventario`), consumido desde el alta de suscripción.
- Routers REST documentados con OpenAPI/Swagger.
- Cola de mensajería real: RabbitMQ + patrón outbox/inbox en `modules/solicitudes-suscripcion`, con worker, reconciler de reintentos, migraciones y tests.
- Patrones Repository y Factory (`DatabaseFactory`) implementados de verdad, no solo nombrados.
- Auth JWT + multi-tenancy + RBAC.
- **Stripe como API externa (resuelto):** `StripePaymentStrategy` + `PaymentStrategyRegistry` (selección por `PAYMENT_PROVIDER`), webhook propio, reconciler de eventos de pago, migración, y wired de verdad en alta/pausa/reanudación/cancelación de suscripción y en el worker de la cola — no solo la interfaz Strategy. 28 casos de test (`test/payments.test.cjs`). Detalle y límites conocidos (tipo de cambio fijo, segundo cobro no probado contra Stripe real) en `docs/pagos-recurrentes.md`.
- **Componente de IA (resuelto — pero con un cambio de rumbo):** la rama `feature/ia` (Gemini/Gemma, con el admin advisor `SuggestCajaAdmin`) **no se mergeó** — quedó bloqueada por el modelo Gemma no respetando `responseMimeType: json` (devolvía razonamiento en texto plano, nunca el JSON). Lo que entró a `main` es una implementación distinta, con DeepSeek (`DeepSeekRecommendationClient`, API OpenAI-compatible con `response_format: json_object`, más confiable para esto): 3 endpoints reales — `recomendar`, `recomendar-general`, `recomendar-existentes` (esta última devuelve cajas ya creadas que calzan con el perfil del suscriptor, no una caja inventada). El advisor para admin de `feature/ia` quedó descartado, no hay que rescatarlo.
- **Tests del componente de IA (resuelto):** `Backend/tests/ai-recommendations.test.ts` cubre los 3 use cases (`RecommendCajaMensual`, `RecommendCajaMensualGeneral`, `RecommendCajasExistentes`) y `DeepSeekRecommendationClient`, con `axios` mockeado (nunca llama a la red real): camino feliz, `DEEPSEEK_API_KEY` ausente (400), respuesta del modelo no parseable o sin `composiciones` (502), suscriptor/caja inexistente (404), y productos inventados por el modelo descartados. Esto cubre el requisito de TP.md de "evidencia de prueba del componente de IA".

**Diferido por decisión del equipo (no se hace en esta entrega):**

## Facade de orquestación — diferido para la Segunda Entrega

`SubscriptionPackFacade.activateSubscriptionAndPrepareFirstBox` (`common/patterns/facades/subscription-pack.facade.ts`) sigue devolviendo `ACTIVATION_PENDING_IMPLEMENTATION`. El equipo decidió explícitamente **no implementarlo para esta entrega** — no porque esté bloqueado (Stripe y el SOAP de inventario ya están disponibles), sino por decisión de alcance. Esto no rompe ninguna funcionalidad real: el alta de suscripción, el cobro recurrente y la actualización de inventario ya funcionan de punta a punta a través de los flujos reales (`POST /api/suscripciones`, `POST /api/solicitudes-suscripcion` + `ProcesarSolicitud` + `createPaymentStrategy()`), sin pasar por el Facade. Queda documentado como deuda técnica para una futura entrega, no como un bug.

Si en el futuro se retoma, el trabajo pendiente sigue siendo el mismo:
- [ ] TODO 1 — Crear registro de suscripción (reusar `CreateSuscripcion`).
- [ ] TODO 2 — Validar inventario vía SOAP (reusar `InventarioSoapClient.consultarInventario`; ya existe, solo falta inyectarlo).
- [ ] TODO 3 — Ejecutar cobro recurrente vía Strategy → ya disponible (`createPaymentStrategy()`); el cobro real hoy ya ocurre en `ProcesarSolicitud`, el Facade solo necesitaría delegarle o replicar ese llamado.
- [ ] TODO 4 — Emitir evento de dominio para la orden de empaque → publicar directo a la cola RabbitMQ existente (recomendado) en vez del `EventDispatcher` en memoria, que sigue sin usarse (ver cabos sueltos).

## Cabos sueltos menores

- `reservarStock` y `actualizarInventario` (SOAP de inventario) siguen servidos pero sin ningún caller; quedan así hasta que se retome el Facade (si se retoma).
- El `EventDispatcher` (Observer en memoria) sigue sin ningún `.subscribe()`/`.dispatch()` real; se mantiene en el código como estructura preparada (ver README, sección "Alcance y limitaciones de esta entrega"), no se borra ni se completa en esta entrega.
- La divergencia de ramas que causó el lío de la cola y del admin advisor de IA ya se resolvió sola (todo consolidado en `main`), pero vale la pena como lección: confirmar en el equipo que `main` es la única rama de trabajo de ahora en más, para no repetir el problema con el próximo feature grande.
