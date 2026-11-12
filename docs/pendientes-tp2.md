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

**Ya cerrado (actualizado tras la extensión de plazo), no tocar salvo bug:**
- **Facade de orquestación (resuelto):** `SubscriptionPackFacade.activateSubscriptionAndPrepareFirstBox` (`common/patterns/facades/subscription-pack.facade.ts`) ya está implementado. Orquesta: 1-2) alta de suscripción + validación de inventario vía SOAP, reusando `CreateSuscripcion` (que ya hace ambas cosas internamente); 3) cobro recurrente inicial vía Strategy (`createPaymentStrategy()`/`ensurePlan()`/`convertAmount()`/`centavos()`, reusados de `ProcesarSolicitud` y `plan-catalog.ts` — se omite solo si `PAYMENT_PROVIDER=none`); 4) evento de dominio `SuscripcionActivada` despachado por el `EventDispatcher` (Observer), con un listener real (`registerPackagingListener`, con guard anti-duplicación porque el dispatcher es singleton) que reserva stock por SOAP (`InventarioSoapClient.reservarStock`) por cada producto de la primera caja. Es un camino alternativo al flujo asincrónico real por cola (`solicitudes-suscripcion` + `ProcesarSolicitud`), pensado para una activación directa (panel de admin o demo); no reemplaza ni duplica ese flujo, reusa sus mismos componentes. Tests en `Backend/tests/subscription-pack-facade.test.ts` (alta sin cobro, alta con checkout vía estrategia `fake`, 404 por caja inexistente, y que una falla de SOAP en la reserva de stock no tira abajo la activación).
- **Observer (resuelto):** el `EventDispatcher` ya tiene un `.subscribe()`/`.dispatch()` real en producción, wireado desde el Facade (ver arriba). No se eliminó: completarlo era la alternativa a borrarlo para seguir cumpliendo el mínimo de 5 patrones que pide `docs/TP.md` (Factory, Repository, Strategy, Observer, Facade).
- `reservarStock` (SOAP de inventario) ahora tiene caller real: el cliente (`InventarioSoapClient`) no tenía el método (el servidor y el WSDL ya lo soportaban, pero no era invocable desde ningún lado); se agregó y lo usa el listener del Facade.

## Cabos sueltos menores

- `actualizarInventario` (SOAP de inventario) sigue servido pero sin ningún caller real todavía.
- La divergencia de ramas que causó el lío de la cola y del admin advisor de IA ya se resolvió sola (todo consolidado en `main`), pero vale la pena como lección: confirmar en el equipo que `main` es la única rama de trabajo de ahora en más, para no repetir el problema con el próximo feature grande.
