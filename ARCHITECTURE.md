# Arquitectura y Guía de Trabajo del Scaffolding | ClubCurator SaaS

Este documento describe la arquitectura, patrones de diseño, estructura modular y lineamientos operativos del scaffolding implementado para **ClubCurator**, plataforma SaaS de clubes de membresía (vinos, cafés y cervezas artesanales).

---

## 1. Resumen General del Scaffolding

El proyecto está diseñado bajo un enfoque de **Monolito Modular (Feature-Based)** en TypeScript, desacoplando backend y frontend en carpetas independientes (`backend` y `frontend`), complementado con orquestación en contenedores mediante **Docker Compose** y soporte dual de persistencia con **TypeORM** (conmutable entre SQLite y PostgreSQL).

El diseño cumple con los requisitos obligatorios de la primera etapa del Trabajo Práctico:
- **Componentes de dominio**: Suscripción (Pedido), Suscriptor (Cliente), CajaMensual (Producto).
- **Componentes de acceso a datos**: Patrón Repository / DAO genérico y específico por entidad.
- **Componentes de utilidad**: Logger reutilizable con niveles y timestamps, middleware de captura global de errores y validador de contratos de entrada.
- **Arquitectura multicapa**: Capa de presentación (Rutas y Controladores) $\rightarrow$ Capa de lógica de negocio (Servicios) $\rightarrow$ Capa de persistencia y dominio (Repositorios y Entidades).

---

## 2. Arquitectura de Software

### 2.1. Arquitectura Modular por Características (Feature-Based / Vertical Slice)
En lugar de agrupar todos los archivos por tipo técnico global (un directorio gigantesco de controladores, otro de servicios, etc.), cada funcionalidad del negocio reside en su propio módulo:
- `Backend/src/modules/suscriptores/`
- `Backend/src/modules/suscripciones/`
- `Backend/src/modules/cajas-mensuales/`
- `Backend/src/modules/productos/`
- `Backend/src/modules/inventario/` (stock + servicio SOAP)
- `frontend/src/modules/suscriptores/`
- `frontend/src/modules/suscripciones/`
- `frontend/src/modules/cajas-mensuales/`
- `frontend/src/modules/productos/`

Esto garantiza alta cohesión dentro de cada feature, bajo acoplamiento entre módulos y facilita una futura transición hacia microservicios o servicios SOA livianos.

### 2.2. Arquitectura Multicapa en el Backend
Cada módulo backend implementa una separación de responsabilidades en tres capas:
1. **Capa de Presentación (`presentation/`)**: Routers (`*-router.ts`), controladores (`controller.ts`) y esquemas zod (`*.schema.ts`). Recibe peticiones HTTP, valida parámetros y body, delega en los casos de uso y devuelve respuestas JSON con códigos HTTP semánticos (200, 201, 400, 404, 409, 503).
2. **Capa de Dominio (`domain/useCase/`)**: Implementa las reglas y validaciones de negocio del SaaS (onboarding de clientes, estados de membresía, curaduría de cajas, verificación de stock). No tiene dependencia de objetos HTTP como `req` o `res`.
3. **Capa de Infraestructura (`infrastructure/`)**: Define las entidades mapeadas con TypeORM (`*.entity.ts`) y abstrae la persistencia mediante repositorios (`*-repository.ts`).

El módulo `inventario` agrega dos carpetas específicas: `soap/` (servidor, WSDL y servicio) y `client/` (cliente SOAP usado por el alta de suscripciones).

### 2.3. Contratos de servicios
- **REST / OpenAPI**: el documento OpenAPI 3.0.3 vive en `Backend/src/config/openapi.ts`, se sirve en `/api/docs` con Swagger UI y se exporta a `docs/openapi.json` con `npm run openapi:export`.
- **SOAP**: el contrato WSDL está en `docs/soap/inventario.wsdl` y se sirve en `/soap/inventario?wsdl`. Implementa `consultarInventario`, `reservarStock` y `actualizarInventario` sobre la tabla `stock_productos`.
- **Integración**: al crear una suscripción, `CreateSuscripcion` consulta el inventario de cada producto de la caja mediante `InventarioSoapClient`; si falta stock responde 409 y si el servicio no está disponible responde 503.

---

## 3. Patrones de Diseño Implementados

### 3.1. Patrón Repository / DAO
- **Ubicación**: `Backend/src/common/interfaces/base-repository.interface.ts` y en cada módulo (`suscriptor-repository.ts`, `suscripcion-repository.ts`, `caja-mensual-repository.ts`).
- **Propósito**: Aislar la lógica de negocio de los detalles de la base de datos y de las consultas TypeORM. Permite cambiar el motor de persistencia o realizar pruebas unitarias con repositorios en memoria (mock) sin alterar los servicios.

### 3.2. Patrón Factory
- **Ubicación**: `Backend/src/config/database.config.ts` (`DatabaseFactory`).
- **Propósito**: Construye y configura dinámicamente la **única** instancia del `DataSource` de TypeORM según las variables de entorno (`DB_TYPE=sqlite` o `DB_TYPE=postgres`). Los repositorios acceden a esa conexión mediante `getDataSource()`, evitando crear conexiones duplicadas. Permite cambiar entre SQLite para desarrollo rápido local y PostgreSQL para entornos Docker o producción con una sola variable, sin modificar código fuente.

### 3.3. Patrón Strategy
- **Ubicación**: `Backend/src/common/patterns/strategies/` (`payment-strategy.interface.ts`, `stripe-payment.strategy.ts`, `fake-payment.strategy.ts`, `payment-strategy.registry.ts`).
- **Propósito**: `IPaymentStrategy` es el contrato único de cobro recurrente (`createSubscriptionPlan`, `startSubscription`, `cancelSubscription`, `parseWebhook`). `StripePaymentStrategy` (Stripe Billing + Checkout) y `FakePaymentStrategy` (demo/tests) son intercambiables; el proveedor se elige con `PAYMENT_PROVIDER` y el dominio nunca ve tipos ni eventos nativos del proveedor. Agregar MercadoPago implica una clase nueva y una línea en el registro. Flujo completo, estados y pruebas en `docs/pagos-recurrentes.md`.

### 3.4. Patrón Observer (Event-Driven)
- **Ubicación**: `Backend/src/common/patterns/events/event-dispatcher.ts` e `IDomainEvent`.
- **Propósito**: Implementa un despachador de eventos de dominio en memoria. Prepara la arquitectura para emitir eventos desacoplados como `PagoRecurrenteAprobado` que disparan la orden de empaque en la bodega física (`InventarioActualizado`), sentando la base para la posterior conexión con colas de mensajería (RabbitMQ / Kafka).

### 3.5. Patrón Facade
- **Ubicación**: `Backend/src/common/patterns/facades/subscription-pack.facade.ts`.
- **Propósito**: Ofrece una interfaz simplificada de alto nivel (`SubscriptionPackFacade`) para orquestar flujos complejos que involucran múltiples subsistemas (validación de suscriptor, cobro recurrente, consulta de inventario SOAP y preparación del primer envío mensual).

---

## 4. Mapeo de Entidades con el Dominio ClubCurator

1. **Suscriptor (`Suscriptor`) [Cliente]**:
   - Campos: `id` (UUID), `nombre`, `email` (único), `telefono`, `preferenciasOrganolepticas` (JSON con categorías vinos/cafés/cervezas, perfiles de sabor, alergias/restricciones y notas de cata), `activo`, timestamps.
2. **Suscripción (`Suscripcion`) [Pedido Recurrente]**:
   - Campos: `id` (UUID), `suscriptorId` (Foreign Key con eliminación en cascada), `categoria`, `estado` (`activa`, `pausada`, `cancelada`), `montoMensual`, `fechaInicio`, `proximoCobro`, timestamps.
3. **CajaMensual (`CajaMensual`) [Producto]**:
   - Campos: `id` (UUID), `nombre`, `categoria`, `mes`, `anio`, `descripcion`, `precioBase`, `disponible`, timestamps.
   - Relación `composiciones`: lista de `CajaMensualProducto` (producto, cantidad, orden y precio aplicado).
4. **Producto (`Producto`) [Ítem de inventario]**:
   - Campos: `id` (UUID), `nombre`, `descripcion`, `categoria`, `tipo`, `productor`, `perfilNotas` (JSON), `alergenosRestricciones` (JSON), `sku`, `precioReferencia`, `activo`, timestamps.

---

## 5. Estructura de Directorios

```text
LeyLine/
├── .agents/
├── .gitignore
├── ARCHITECTURE.md
├── README.md
├── docker-compose.yml
├── docs/
│   ├── TP.md
│   ├── arquitectura-backend.md
│   ├── diagrama-de-clases.md
│   ├── diagrama-entidad-relacion.dbml
│   └── pasos-a-seguir.md
├── Backend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── config/
│       │   ├── env.config.ts
│       │   └── database.config.ts
│       ├── migrations/
│       │   └── <timestamp>-InitialSchema.ts
│       ├── seeds/
│       │   └── seed.ts
│       ├── common/
│       │   ├── classes/
│       │   │   └── base-typeorm-repository.ts
│       │   ├── errors/
│       │   │   └── app-error.ts
│       │   ├── interfaces/
│       │   │   └── base-repository.interface.ts
│       │   ├── middlewares/
│       │   │   ├── error.middleware.ts
│       │   │   ├── logger.middleware.ts
│       │   │   └── validation.middleware.ts
│       │   ├── patterns/
│       │   │   ├── events/
│       │   │   │   ├── domain-event.interface.ts
│       │   │   │   └── event-dispatcher.ts
│       │   │   ├── facades/
│       │   │   │   └── subscription-pack.facade.ts
│       │   │   ├── factory/
│       │   │   │   └── entities.ts
│       │   │   └── strategies/
│       │   │       └── payment-strategy.interface.ts
│       │   └── utils/
│       │       └── logger.ts
│       └── modules/
│           ├── suscriptores/
│           │   ├── domain/useCase/
│           │   ├── infrastructure/
│           │   │   ├── suscriptor.entity.ts
│           │   │   └── suscriptor-repository.ts
│           │   └── presentation/
│           │       ├── controller.ts
│           │       ├── suscriptores-router.ts
│           │       └── suscriptor.schema.ts
│           ├── suscripciones/
│           │   ├── domain/useCase/
│           │   ├── infrastructure/
│           │   │   ├── suscripcion.entity.ts
│           │   │   └── suscripcion-repository.ts
│           │   └── presentation/
│           │       ├── controller.ts
│           │       ├── suscripciones-router.ts
│           │       └── suscripcion.schema.ts
│           ├── cajas-mensuales/
│           │   ├── domain/useCase/
│           │   ├── infrastructure/
│           │   │   ├── caja-mensual.entity.ts
│           │   │   ├── caja-mensual-producto.entity.ts
│           │   │   └── caja-mensual-repository.ts
│           │   └── presentation/
│           │       ├── controller.ts
│           │       ├── cajas-mensuales-router.ts
│           │       └── caja-mensual.schema.ts
│           └── productos/
│               ├── domain/useCase/
│               ├── infrastructure/
│               │   ├── producto.entity.ts
│               │   └── producto-repository.ts
│               └── presentation/
│                   ├── controller.ts
│                   ├── productos-router.ts
│                   └── producto.schema.ts
│
└── frontend/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    └── src/
        ├── App.vue
        ├── main.ts
        ├── vite-env.d.ts
        ├── assets/
        │   └── main.css
        ├── router/
        │   └── index.ts
        ├── views/
        │   └── DashboardView.vue
        ├── common/
        │   ├── api/
        │   │   └── http-client.ts
        │   ├── components/
        │   │   ├── AppNavbar.vue
        │   │   ├── ConfirmModal.vue
        │   │   └── ToastNotification.vue
        │   └── store/
        │       └── toast.store.ts
        └── modules/
            ├── suscriptores/
            │   ├── components/SuscriptorModal.vue
            │   ├── services/suscriptores.service.ts
            │   ├── store/suscriptores.store.ts
            │   └── views/SuscriptoresView.vue
            ├── suscripciones/
            │   ├── components/SuscripcionModal.vue
            │   ├── services/suscripciones.service.ts
            │   ├── store/suscripciones.store.ts
            │   └── views/SuscripcionesView.vue
            ├── cajas-mensuales/
            │   ├── components/CajaMensualModal.vue
            │   ├── services/cajas-mensuales.service.ts
            │   ├── store/cajas-mensuales.store.ts
            │   └── views/CajasMensualesView.vue
            └── productos/
                ├── components/ProductoModal.vue
                ├── services/productos.service.ts
                ├── store/productos.store.ts
                └── views/ProductosView.vue
```

---

## 6. Guía de Ejecución y Trabajo

### 6.1. Requisitos Previos
- **Node.js**: Versión 20 LTS o superior.
- **npm**: Versión 10 o superior (en Windows PowerShell, utilizar `npm.cmd` si existen políticas de ejecución restringidas para `.ps1`).
- **Docker y Docker Compose**: (Opcional para desarrollo local con SQLite, recomendado para PostgreSQL y pruebas).

---

### 6.2. Uso de Docker para PostgreSQL 16
Docker se utiliza exclusivamente para proveer una base de datos PostgreSQL 16 aislada con volumen persistente para desarrollo y migraciones:

1. **Iniciar la base de datos en segundo plano**:
   ```bash
   docker compose up -d
   ```
2. **Verificar el estado del contenedor**:
   ```bash
   docker compose ps
   ```
3. **Detener la base de datos**:
   ```bash
   docker compose down
   ```

---

### 6.3. Modo 1: Desarrollo Local con SQLite (Sin Docker)
Útil para prototipado rápido sin dependencias externas:

1. En `Backend/.env`, configurar:
   ```env
   DB_TYPE=sqlite
   DB_SQLITE_PATH=clubcurator.sqlite
   DB_SYNCHRONIZE=true
   DB_LOGGING=true
   ```
2. Iniciar el Backend:
   ```bash
   cd Backend
   npm run dev
   ```
3. Iniciar el Frontend:
   ```bash
   cd frontend
   npm run dev
   ```

---

### 6.4. Modo 2: Desarrollo Local con PostgreSQL (Vía Docker)
1. Levanta el contenedor de PostgreSQL con `docker compose up -d`.
2. En `Backend/.env`, asegúrate de tener:
   ```env
   DB_TYPE=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_DATABASE=clubcurator_db
   DB_SYNCHRONIZE=false # Recomendado en 'false' si se gestiona el esquema vía migraciones
   DB_LOGGING=true
   ```
3. Ejecuta las migraciones y, opcionalmente, el seed de datos de prueba:
   ```bash
   cd Backend
   npm run migration:run
   npm run seed
   npm run dev
   ```

---

### 6.5. Gestión de Migraciones con TypeORM
Para mantener el historial de cambios en el esquema de base de datos de PostgreSQL a medida que evolucionen las entidades:

1. **Generar una migración automáticamente a partir de cambios en las entidades**:
   Compara las entidades de TypeScript contra el esquema actual de PostgreSQL y genera el archivo SQL correspondiente en `src/migrations/`:
   ```bash
   cd Backend
   npm run migration:generate -- src/migrations/NombreDelCambio
   ```
   *(Ejemplo: `npm run migration:generate -- src/migrations/InitialSchema`)*
   La migración inicial del proyecto ya está versionada como `<timestamp>-InitialSchema.ts`.

2. **Ejecutar las migraciones pendientes en PostgreSQL**:
   Aplica todas las migraciones no ejecutadas:
   ```bash
   npm run migration:run
   ```

3. **Revertir la última migración aplicada**:
   ```bash
   npm run migration:revert
   ```

4. **Crear una migración vacía manual (opcional)**:
   ```bash
   npm run migration:create -- src/migrations/NombreDeLaMigracionManual
   ```

---

### 6.6. Calidad y Pruebas

Backend y frontend comparten los scripts `lint` (ESLint), `format` (Prettier), `typecheck` (`tsc` / `vue-tsc`) y `test` (Vitest). Las pruebas de integración del backend levantan la API con Supertest sobre un SQLite en memoria, por lo que no requieren PostgreSQL ni Docker. El workflow `.github/workflows/ci.yml` corre lint, typecheck y tests en cada push y pull request.

---

## 7. Lineamientos para la Implementación de Código

Cuando comiences a desarrollar la lógica de negocio, se recomienda seguir este flujo para mantener la arquitectura limpia:

1. **Definir modelos y contratos**: Modificar o ampliar las columnas en `*.entity.ts` dentro de `src/modules/[feature]/`.
2. **Operaciones de persistencia**: Agregar consultas personalizadas o métodos especializados en `*.repository.ts`.
3. **Reglas de negocio**: Implementar algoritmos, validaciones y cálculos en `domain/useCase/*.ts`. Aquí se conecta el recomendador y la verificación de stock vía SOAP.
4. **Exposición de endpoints**: Conectar los nuevos métodos en `*.controller.ts` y mapear sus rutas HTTP en `*.routes.ts`.
5. **Consumo en Frontend**:
   - Declarar el método en `src/modules/[feature]/services/[feature].service.ts`.
   - Gestionar el estado reactivo en `src/modules/[feature]/store/[feature].store.ts` con Pinia.
   - Enlazar la vista en `src/modules/[feature]/views/[feature]View.vue`.
