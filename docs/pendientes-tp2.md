# LeyLine — Pendientes TP Segunda Parte

*2026-11-09*

Esta lista es contra `docs/TP.md` (requisitos de la Segunda Parte) y el código real en `feature/integracion-ramas`, que es el merge de `feature/integrar-auth-multitenancy` + `feature/queue` + soft-delete.

**Ya cerrado, no tocar salvo bug:**
- SOAP de inventario (WSDL + `consultarInventario`/`reservarStock`/`actualizarInventario`), consumido desde el alta de suscripción.
- 5 routers REST documentados con OpenAPI/Swagger.
- Cola de mensajería real: RabbitMQ + patrón outbox/inbox en `modules/solicitudes-suscripcion`, con worker, reconciler de reintentos, migraciones y tests.
- Patrones Repository y Factory (`DatabaseFactory`) implementados de verdad, no solo nombrados.
- Auth JWT + multi-tenancy + RBAC.

**Lo que falta es lo de abajo.**

## Pendiente 1 — Stripe como API externa (hecho y validado en modo test)

Implementado en `feature/pagos-stripe` y probado contra Stripe real (sandbox): checkout por la cola, activación por webhook, pausar,
reanudar y cancelar, todo también en Docker. Detalle, garantías y configuración en `docs/pagos-recurrentes.md`.

**Resuelto después de la primera versión:** alta sin pago del suscriptor bloqueada, conversión de pesos a la moneda de cobro, reproceso
de eventos de pago perdidos, recuperación de suscripciones pausadas por un cobro rechazado, checkout con vencimiento y descartable,
reutilización del cliente y portal de facturación, y documentación en OpenAPI.

**Límites conocidos:**
- El tipo de cambio es fijo (`PAYMENT_FX_RATE`); no se consulta una cotización en vivo.
- El segundo cobro mensual con Stripe real no se ejercitó (sólo con eventos simulados); haría falta un reloj de pruebas de Stripe.
- En producción el secreto del webhook sale de un endpoint creado en el dashboard, no del Stripe CLI.

## Pendiente 2 — Componente de IA (recomendador)

`RecommendCajaMensual` (`modules/cajas-mensuales/domain/useCase/recommend-caja-mensual.ts`) está enganchado a un endpoint REST real, pero adentro es un heurístico hardcodeado: devuelve un nombre armado por template, precio fijo (`12500.00`) y `composiciones: []`. No hay modelo, no hay llamada a ninguna API de ML/LLM.

**Tareas:**
- [ ] Elegir el enfoque permitido por la consigna: recomendación por contenido/historial (usar `preferenciasOrganolepticas` del Suscriptor y `perfilNotas` de Producto), o delegar a una API de LLM (OpenAI/HF) para rankear/elegir productos.
- [ ] Reemplazar la lógica de `RecommendCajaMensual.execute` por el algoritmo real, devolviendo `composiciones` reales en vez de `[]`.
- [ ] Credenciales/config si se usa una API externa (`OPENAI_API_KEY` o similar) en `.env.example`.
- [ ] Exponerlo como REST (ya existe el endpoint) o, si se quiere cumplir también el requisito asíncrono, invocarlo vía la cola existente (RabbitMQ) en lugar de sincrónico.
- [ ] Evidencia de prueba del componente de IA (pedida explícitamente en el entregable de TP.md).

## Pendiente 3 — Facade de orquestación

`SubscriptionPackFacade.activateSubscriptionAndPrepareFirstBox` (`common/patterns/facades/subscription-pack.facade.ts`) devuelve `ACTIVATION_PENDING_IMPLEMENTATION`. Tiene 4 TODOs que dependen directamente de los dos pendientes anteriores, por eso conviene cerrarlo después de Stripe e IA, no antes:

- [ ] TODO 1 — Crear registro de suscripción (reusar `CreateSuscripcion`).
- [ ] TODO 2 — Validar inventario vía SOAP (reusar `InventarioSoapClient.consultarInventario`; ya existe, solo falta inyectarlo).
- [ ] TODO 3 — Ejecutar cobro recurrente vía Strategy → ya disponible (Pendiente 1); el cobro hoy ocurre en `ProcesarSolicitud.startPayment`.
- [ ] TODO 4 — Emitir evento de dominio para la orden de empaque → usar el `EventDispatcher`/Observer existente (hoy definido pero sin ningún `subscribe`/`dispatch` real en el código) o, mejor, publicar directamente a la cola RabbitMQ ya armada en `solicitudes-suscripcion`.

## Cabos sueltos menores

- `reservarStock` y `actualizarInventario` (SOAP de inventario) están servidos pero sin ningún caller en el backend; probablemente se usen recién cuando se implemente el Facade (Pendiente 3).
- El `EventDispatcher` (Observer en memoria) existe pero no tiene ningún `.subscribe()`/`.dispatch()` real todavía; evaluar si conviene eliminarlo en favor de publicar directo a RabbitMQ, para no mantener dos mecanismos de eventos en paralelo.
- Confirmar qué rama van a usar como base estándar de equipo de ahora en más (`feature/integracion-ramas` vs `frontend` vs `feature/integrar-auth-multitenancy`) para evitar que se vuelvan a divergir trabajos como pasó con la cola.
