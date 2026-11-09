# Pasos a seguir — Plan de trabajo de LeyLine / ClubCurator

Este documento es la hoja de ruta viva del proyecto. Describe **qué falta hacer**, **cómo hacerlo**, **dónde toca el código** y **cómo saber que está terminado**. Se debe actualizar a medida que avanza el trabajo.

---

## 0. Cómo usar este documento

### Convenciones de estado

| Marca | Significado |
|---|---|
| `- [ ]` | Pendiente |
| `- [x]` | Terminado y verificado |
| `- [ ] (en curso)` | Se está trabajando ahora |
| `- [ ] (bloqueado)` | No se puede avanzar por una dependencia |

Reglas:

1. Marcar una tarea como `[x]` **solo** cuando cumple su criterio de aceptación y fue probada.
2. Si una tarea queda a medias, dejarla `[ ]` con la nota `(en curso)` y agregar en la bitácora qué falta.
3. Cada fase tiene una sección **Criterio de aceptación**. No se pasa a la fase siguiente hasta cumplirlo.
4. Toda decisión de arquitectura relevante se anota en la sección **Riesgos y decisiones pendientes**.

### Definición de terminado (Definition of Done) global

Una tarea se considera terminada cuando:

- [ ] El código compila (`npm run build` en Backend y frontend).
- [ ] El endpoint/flujo funciona contra SQLite y, si aplica, contra PostgreSQL.
- [ ] Hay manejo de errores con códigos HTTP correctos.
- [ ] Está documentado (README, `docs/` o comentario de contrato).
- [ ] Se agregó o actualizó la prueba correspondiente.
- [ ] Se registró el avance en la bitácora.

---

## 1. Foto actual del proyecto

### 1.1 Estado por módulo

| Módulo | Backend | Frontend | Observaciones |
|---|---|---|---|
| Suscriptores | CRUD completo | CRUD completo | Sin paginación ni búsqueda |
| Suscripciones | CRUD + pausar/cancelar + validación de stock por SOAP | CRUD + pausar/cancelar | Depende de caja, suscriptor e inventario |
| Cajas mensuales | CRUD + composiciones + recomendar (stub) | CRUD sin composiciones | El modal no permite asociar productos |
| Productos | CRUD completo | CRUD completo | Borrado RESTRICT traducido a 409 |
| Inventario | Stock por producto + servicio SOAP + cliente interno | — | `consultarInventario`, `reservarStock`, `actualizarInventario` |

### 1.2 Cumplimiento del trabajo práctico

| Etapa | Estado | Qué falta |
|---|---|---|
| TP Inicial | Mayormente cumplido | Diagrama de componentes, diagrama de despliegue, evidencia de ejecución remota |
| TP Primera Parte | Cumplido en su mayoría | Facade y Strategy solo preparados, no implementados; falta modelado BPMN/secuencia |
| TP Segunda Parte | **Parcial** | SOAP y OpenAPI listos; faltan colas, API externa de pagos e IA real |
| TP Integrador | **Pendiente** | Pruebas, diagramas de integración, manual de despliegue, validación de IA |

### 1.3 Deuda técnica detectada (prioridad alta)

| # | Problema | Ubicación | Impacto | Estado |
|---|---|---|---|---|
| D1 | Doble `DataSource`: `server.ts` inicializa `AppDataSource` y `app.ts` crea otro con `DBEngineFactory` | `Backend/src/server.ts:10`, `Backend/src/app.ts:19-24` | Dos conexiones, acoplamiento circular, comportamiento frágil | Resuelto (2026-11-05) |
| D2 | `dataSource.synchronize()` sin `await` | `Backend/src/app.ts:21` | Condición de carrera al arrancar | Resuelto (2026-11-05) |
| D3 | `suscriptorId` es `varchar` pero referencia un `uuid` | `Backend/src/modules/suscripciones/infrastructure/suscripcion.entity.ts:17-21` | Posible fallo de FK en PostgreSQL | Resuelto (2026-11-05) |
| D4 | `cajaMensualId` con `onDelete: 'SET NULL'` sobre columna no nullable; el DBML dice `RESTRICT` | `suscripcion.entity.ts:24-28`, `docs/diagrama-entidad-relacion.dbml` | Borrado inconsistente y documentación contradictoria | Resuelto (2026-11-05) |
| D5 | No existe migración inicial | `Backend/src/migrations/` | PostgreSQL con `DB_SYNCHRONIZE=false` queda sin esquema | Resuelto (2026-11-05) |
| D6 | Middleware de validación creado pero no usado | `Backend/src/common/middlewares/validation.middleware.ts` | No se validan contratos de entrada | Resuelto (2026-11-05) |
| D7 | `BaseTypeORM.delete` lanza strings en vez de `AppError` | `Backend/src/common/classes/base-typeorm-repository.ts` | Errores 500 en vez de 404/409 | Resuelto (2026-11-05) |
| D8 | Sin tests, lint ni CI | Raíz del repo | No hay red de seguridad para refactors | Resuelto (2026-11-05) |
| D9 | README usa `cd backend` / `cd frontend`; las carpetas son `Backend` / `frontend` | `README.md:33,38,51,56` | Falla en Linux por mayúsculas | Resuelto (2026-11-05) |
| D10 | `ARCHITECTURE.md` describe rutas y archivos previos al refactor DDD | `ARCHITECTURE.md` | Documentación desactualizada | Resuelto (2026-11-05) |

---

## 2. Fase 0 — Saneamiento y base confiable

Objetivo: dejar una base técnica estable antes de agregar integraciones.

### 0.1 Unificar la conexión a base de datos

- [x] Crear un único punto de composición de la base (por ejemplo `Backend/src/config/data-source.ts`).
- [x] Hacer que `server.ts` inicialice esa única instancia y la comparta con `app.ts`.
- [x] Eliminar la creación duplicada en `app.ts:19-24`.
- [x] Quitar el `import { dataSource } from '../../../app'` de los repositorios y recibir la conexión por el composition root.
- [x] Corregir `dataSource.synchronize()` para que sea `await dataSource.synchronize()` cuando corresponda.

**Criterio de aceptación:** el servidor arranca con una sola conexión, los repositorios no importan desde `app.ts` y no hay ciclos de importación.

### 0.2 Corregir el modelo de datos y las claves foráneas

- [x] Unificar el tipo de `Suscripcion.suscriptorId` con el PK de `Suscriptor` (`uuid`).
- [x] Definir explícitamente la política de borrado de `cajaMensual`: si es `RESTRICT`, ajustar la entidad y el DBML.
- [x] Revisar los tipos `uuid` en SQLite y PostgreSQL para asegurar compatibilidad.
- [x] Actualizar `docs/diagrama-entidad-relacion.dbml` para que coincida con las entidades.
- [x] Actualizar `docs/diagrama-de-clases.md` si cambian las relaciones.

**Criterio de aceptación:** el esquema se crea sin errores en PostgreSQL y SQLite, y la documentación coincide con el código.

### 0.3 Migración inicial

- [x] Generar la migración inicial con `npm run migration:generate -- src/migrations/InitialSchema`.
- [x] Revisar el SQL generado.
- [x] Ejecutarla con `npm run migration:run` contra PostgreSQL.
- [x] Verificar que el seed funciona después de migrar.
- [x] Documentar el procedimiento en el README.

**Criterio de aceptación:** una base PostgreSQL vacía queda operativa solo con `migration:run` + `seed`.

### 0.4 Validación de entrada

- [x] Definir esquemas de validación para cada módulo (body y params).
- [x] Aplicar `validateBody` (o el validador elegido) en todos los routers.
- [x] Validar UUIDs de parámetros y paginación cuando exista.
- [x] Unificar el formato de error de validación.

**Criterio de aceptación:** un body inválido devuelve `400` con mensaje claro en los 4 módulos.

### 0.5 Manejo de errores consistente

- [x] Reemplazar los `throw "..."` de `BaseTypeORM` por `AppError` con código adecuado.
- [x] Traducir errores de FK (`RESTRICT`) a `409 Conflict` o `400`.
- [x] Revisar que ningún error interno filtre stack al cliente.
- [x] Agregar un identificador de request en los logs (header `X-Request-Id`).

**Criterio de aceptación:** todos los errores esperables devuelven códigos semánticos y mensajes claros.

### 0.6 Calidad: scripts, lint y tests base

- [x] Agregar ESLint + Prettier al Backend y al frontend.
- [x] Agregar scripts `lint`, `format`, `test` y `typecheck` en ambos `package.json`.
- [x] Elegir framework de pruebas (Vitest para frontend, Vitest/Jest para backend).
- [x] Escribir pruebas unitarias mínimas de casos de uso (alta y validaciones).
- [x] Escribir pruebas de integración mínimas de endpoints con base en memoria o SQLite temporal.
- [x] Agregar un workflow de CI (lint + typecheck + test).

**Criterio de aceptación:** `npm run lint`, `npm run typecheck` y `npm test` pasan en verde en ambos proyectos.

### 0.7 Documentación base

- [x] Corregir las rutas `cd backend` / `cd frontend` del README.
- [x] Actualizar `ARCHITECTURE.md` al refactor DDD actual.
- [x] Documentar variables de entorno reales (`.env.example` completo).
- [x] Documentar comandos de arranque, migración y seed.

**Criterio de aceptación:** una persona nueva puede levantar el proyecto siguiendo el README sin adivinar nada.

---

## 3. Fase 1 — Contratos de servicios (REST + SOAP)

Objetivo: cumplir con los servicios web obligatorios de la Segunda Parte.

### 3.1 Documentación OpenAPI / Swagger de los REST

- [x] Elegir herramienta (`swagger-jsdoc` + `swagger-ui-express` o similar).
- [x] Documentar los 4 módulos: rutas, payloads, respuestas y errores.
- [x] Exponer Swagger UI en `/api/docs`.
- [x] Incluir ejemplos de request/response.
- [x] Exportar el `openapi.json` a `docs/`.

**Criterio de aceptación:** Swagger UI lista todos los endpoints y se puede probar un CRUD completo desde ahí.

### 3.2 Servicio SOAP de inventario

- [x] Definir el contrato: operaciones `consultarInventario`, `reservarStock` y `actualizarInventario` (ajustar según necesidad).
- [x] Crear el WSDL en `docs/soap/` o en el módulo correspondiente.
- [x] Implementar el servidor SOAP (por ejemplo con la librería `soap`).
- [x] Modelar el stock por producto y productor.
- [x] Exponer el servicio en un puerto o ruta propia.
- [x] Documentar cómo invocarlo (ejemplo de request SOAP).

**Criterio de aceptación:** se puede consultar el inventario de un producto vía SOAP y obtener una respuesta válida según el WSDL.

### 3.3 Cliente SOAP interno

- [x] Crear un cliente que consuma el servicio SOAP desde el flujo de cajas/suscripciones.
- [x] Manejar timeouts y errores del servicio externo.
- [x] Integrarlo en el caso de uso que prepara una caja o un pedido.

**Criterio de aceptación:** el backend consulta inventario real antes de confirmar una caja/pedido.

### 3.4 Documentación de contratos

- [x] Documentar REST (OpenAPI) y SOAP (WSDL) en `docs/`.
- [x] Agregar una tabla de endpoints y operaciones.
- [x] Documentar códigos de error y ejemplos.

---

## 4. Fase 2 — Mensajería asíncrona

Objetivo: reemplazar el `EventDispatcher` en memoria por una cola real.

### 4.1 Infraestructura

- [ ] Agregar RabbitMQ (o Kafka) al `docker-compose.yml`.
- [ ] Configurar credenciales y puertos en `.env.example`.
- [ ] Documentar cómo levantarlo y verificarlo.

### 4.2 Abstracción del broker

- [ ] Crear una interfaz `IMessageBroker` (`publish`, `subscribe`).
- [ ] Implementar el adaptador para RabbitMQ/Kafka.
- [ ] Mantener el `EventDispatcher` solo como fallback de desarrollo si se desea.

### 4.3 Eventos y consumidores

- [ ] Definir eventos: `SuscripcionCreada`, `PagoRecurrenteAprobado`, `PedidoCreado`, `InventarioActualizado`.
- [ ] Implementar productor al crear una suscripción/pedido.
- [ ] Implementar consumidor que genere la orden de empaque.
- [ ] Implementar consumidor que actualice inventario vía SOAP.
- [ ] Definir colas, routing keys y nombres de exchange.

### 4.4 Robustez

- [ ] Implementar reintentos con backoff.
- [ ] Implementar dead-letter queue (DLQ).
- [ ] Implementar idempotencia de consumidores.
- [ ] Loguear trazabilidad por `eventId`/`correlationId`.

**Criterio de aceptación:** al crear una suscripción se publica un evento, un consumidor lo procesa y el flujo de empaque/inventario se ejecuta sin intervención manual.

---

## 5. Fase 3 — API externa de pagos y Facade

Objetivo: integrar facturación recurrente real y orquestar el flujo completo.

### 5.1 Implementar Strategy de pagos

- [ ] Elegir proveedor (Stripe o MercadoPago Subscriptions).
- [ ] Implementar `IPaymentStrategy` con el proveedor elegido.
- [ ] Configurar credenciales en `.env.example`.
- [ ] Implementar creación de plan, cobro recurrente y cancelación.
- [ ] Manejar errores y respuestas del proveedor.

### 5.2 Webhooks / confirmación de pago

- [ ] Exponer endpoint de webhook.
- [ ] Validar la firma del webhook.
- [ ] Al aprobarse el pago, publicar `PagoRecurrenteAprobado` en la cola.
- [ ] Registrar el resultado del pago en la suscripción.

### 5.3 Facade de suscripción real

- [ ] Inyectar dependencias en `SubscriptionPackFacade`.
- [ ] Implementar: crear suscripción -> validar inventario SOAP -> cobrar -> emitir evento de empaque.
- [ ] Manejar compensaciones si falla un paso.
- [ ] Exponer el flujo mediante un endpoint.

**Criterio de aceptación:** se puede activar una suscripción de punta a punta con pago de prueba y evento de empaque emitido.

---

## 6. Fase 4 — Componente de IA

Objetivo: pasar del stub hardcodeado a un recomendador real y consumible.

### 6.1 Definir el enfoque

- [ ] Elegir modelo: heurístico/reglas, filtrado colaborativo simple, contenido o API de LLM/ML.
- [ ] Documentar la decisión y sus límites.
- [ ] Definir requerimientos no funcionales: latencia, exactitud mínima, privacidad.

### 6.2 Recomendador real

- [ ] Leer `preferenciasOrganolepticas` del suscriptor desde la base.
- [ ] Leer productos y sus atributos (`perfilNotas`, `alergenosRestricciones`, `categoria`).
- [ ] Implementar scoring por afinidad y restricciones (excluir alérgenos).
- [ ] Armar una caja con `composiciones` reales y precio calculado.
- [ ] Persistir o registrar la recomendación y su explicación.

### 6.3 Exposición del servicio

- [ ] Exponer el recomendador como endpoint REST (`POST /api/cajas-mensuales/recomendar`).
- [ ] Alternativamente, exponerlo como consumidor asíncrono de la cola.
- [ ] Documentar el contrato y ejemplos.

### 6.4 Validación

- [ ] Definir métricas (precisión, cobertura, satisfacción simulada).
- [ ] Armar un set de casos de prueba con perfiles conocidos.
- [ ] Documentar resultados y limitaciones.

**Criterio de aceptación:** para un suscriptor con preferencias reales, la recomendación devuelve productos coherentes, respeta restricciones y se explica.

---

## 7. Fase 5 — Frontend y funcionalidad de producto

Objetivo: cerrar huecos visibles de la interfaz.

### 7.1 Composiciones en cajas

- [ ] Agregar selección de productos y cantidades en `CajaMensualModal.vue`.
- [ ] Enviar `composiciones` en create/update.
- [ ] Mostrar las composiciones en la tabla de cajas.
- [ ] Validar que no se repitan productos y que las cantidades sean válidas.

### 7.2 Recomendador en la UI

- [ ] Agregar botón "Recomendar caja" en la vista de suscripciones o suscriptores.
- [ ] Consumir `cajasMensualesService.recommend`.
- [ ] Mostrar la recomendación y permitir aceptarla/crear la caja.

### 7.3 Dashboard con métricas

- [ ] Mostrar cantidad de suscriptores activos.
- [ ] Mostrar suscripciones por estado.
- [ ] Mostrar ingresos recurrentes estimados.
- [ ] Mostrar próximos cobros.

### 7.4 Tablas

- [ ] Agregar búsqueda por texto.
- [ ] Agregar filtros por estado/categoría.
- [ ] Agregar paginación.
- [ ] Manejar estados de carga y error de forma consistente.

### 7.5 Autenticación (opcional, evaluar con la cátedra)

- [ ] Definir si el TP requiere login.
- [ ] Si sí: implementar autenticación y roles (admin/operador).

---

## 8. Fase 6 — Integrador: pruebas, documentación y defensa

### 8.1 Diagramas

- [ ] Diagrama de componentes.
- [ ] Diagrama de despliegue.
- [ ] Diagrama de secuencia del flujo de suscripción/cobro/empaque.
- [ ] BPMN simplificado del proceso de negocio.
- [ ] Diagrama de flujo de mensajes entre servicios.
- [ ] Actualizar `docs/` y `ARCHITECTURE.md`.

### 8.2 Pruebas

- [ ] Pruebas funcionales de cada módulo.
- [ ] Pruebas de integración REST/SOAP.
- [ ] Pruebas de productores/consumidores de la cola.
- [ ] Pruebas del componente de IA con casos conocidos.
- [ ] Prueba de carga básica (por ejemplo k6 o Artillery).
- [ ] Documentar evidencias de ejecución.

### 8.3 Documentación técnica final

- [ ] Arquitectura actualizada.
- [ ] Contratos REST (OpenAPI) y SOAP (WSDL).
- [ ] Configuración de colas y eventos.
- [ ] Decisiones de diseño de IA.
- [ ] Manual de despliegue (local y contenedores).
- [ ] Manual de usuario breve.

### 8.4 Demo y defensa

- [ ] Preparar guion de demo en vivo.
- [ ] Preparar explicación de decisiones arquitectónicas.
- [ ] Preparar explicación del uso de IA.
- [ ] Verificar que todo corre desde cero con Docker.

---

## 9. Matriz de cumplimiento del TP

| Requisito | Etapa | Dónde se cumple | Tarea asociada | Estado |
|---|---|---|---|---|
| 3 componentes reutilizables (dominio, datos, utilidad) | Inicial | `Backend/src/modules`, `common` | Fase 0 | `[x]` |
| Aplicación multicapa | Inicial | Backend por capas | Fase 0 | `[x]` |
| Gestión de dependencias npm | Inicial | `package.json` | Fase 0 | `[x]` |
| Ejecución local y remota | Inicial | Docker / API | Fase 1 | `[ ]` |
| Patrones Factory, Repository, Strategy, Observer, Facade | 1ra | `common/patterns` | Fases 2-3 | `[ ]` |
| Servicio SOAP con WSDL | 2da | `Backend/src/modules/inventario/soap`, `docs/soap/` | Fase 1 | `[x]` |
| Al menos dos servicios REST con OpenAPI | 2da | `Backend/src/config/openapi.ts`, `/api/docs` | Fase 1 | `[x]` |
| Cola de mensajes con productores/consumidores | 2da | Fase 2 | Fase 2 | `[ ]` |
| API externa real (pagos) | 2da | Fase 3 | Fase 3 | `[ ]` |
| Componente de IA funcional | 2da | Fase 4 | Fase 4 | `[ ]` |
| Manejo de errores, logging, config externalizada | Todas | Backend | Fase 0 | `[x]` |
| Pruebas funcionales/integración/carga | Integrador | Fase 6.2 | Fase 6 | `[ ]` |
| Diagramas de componentes/secuencia/despliegue | Integrador | Fase 6.1 | Fase 6 | `[ ]` |
| Manual de despliegue | Integrador | Fase 6.3 | Fase 6 | `[ ]` |

---

## 10. Riesgos y decisiones pendientes

| # | Tema | Decisión / riesgo | Estado |
|---|---|---|---|
| R1 | Framework empresarial | Se usa Express; evaluar si la cátedra lo acepta o si conviene justificar el stack | Pendiente |
| R2 | Broker | RabbitMQ vs Kafka; RabbitMQ suele ser más simple para el TP | Pendiente |
| R3 | Pagos | Stripe vs MercadoPago según disponibilidad de cuenta de prueba | Pendiente |
| R4 | IA | Reglas/heurística vs modelo/LLM; evaluar tiempo y requisitos de latencia | Pendiente |
| R5 | Autenticación | Confirmar si es requisito del integrador | Pendiente |
| R6 | Base de datos | SQLite para desarrollo y PostgreSQL para entrega | Definido |
| R7 | Alcance de microservicios | Monolito modular vs separar servicios; justificar en la defensa | Pendiente |

---

## 11. Bitácora de avance

| Fecha | Fase | Cambio realizado | Autor | Verificado |
|---|---|---|---|---|
| 2026-11-05 | Fase 1 | OpenAPI 3.0.3 + Swagger UI (`/api/docs`), export `docs/openapi.json`; módulo de inventario con `StockProducto`, migración y seed; servicio SOAP `/soap/inventario` (`consultarInventario`, `reservarStock`, `actualizarInventario`) y cliente interno con timeout integrado en `CreateSuscripcion` (409 sin stock, 503 sin servicio); `docs/contratos-servicios.md`, WSDL y DBML actualizados | opencode | `npm run lint`, `npm run typecheck`, `npm test` (9 tests) y `npm run build` en verde; SOAP verificado contra PostgreSQL: consulta, reserva, actualización, alta 201 con stock y 409 sin stock |
| 2026-11-05 | Fase 0 | DataSource único (`getDataSource`), modelo corregido (`suscriptorId` uuid, FK `RESTRICT`), migración inicial + seed, validación zod en 4 módulos, errores 404/409, request id, ESLint/Prettier, Vitest+Supertest, CI y documentación actualizada | opencode | `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` en verde (Backend y frontend); `migration:run` + `seed` en PostgreSQL; smoke tests 400/409 |

---

## 12. Comandos útiles

### Backend

```bash
cd Backend
npm install
npm run dev            # desarrollo con tsx watch
npm run build          # compilar TypeScript
npm run seed           # cargar datos de prueba
npm run migration:generate -- src/migrations/NombreDelCambio
npm run migration:run
npm run migration:revert
npm run openapi:export  # regenera docs/openapi.json
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
```

### Docker (PostgreSQL)

```bash
docker compose up -d
docker compose ps
docker compose down
```

### Verificación rápida

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/suscriptores
curl http://localhost:3000/api/cajas-mensuales
curl http://localhost:3000/api/docs.json
curl 'http://localhost:3000/soap/inventario?wsdl'
```

---

## 13. Próximo paso inmediato

La **Fase 1 está cerrada**. El siguiente paso es la **Fase 2 — Mensajería asíncrona**:

1. Elegir broker (RabbitMQ o Kafka) y agregar la infraestructura local.
2. Reemplazar el `EventDispatcher` en memoria por un publicador/consumidor real.
3. Publicar `PagoRecurrenteAprobado` y consumirlo para disparar `InventarioActualizado`.
4. Documentar el flujo y agregar pruebas de integración.
