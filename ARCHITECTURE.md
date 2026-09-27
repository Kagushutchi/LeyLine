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
- `backend/src/modules/suscriptores/`
- `backend/src/modules/suscripciones/`
- `backend/src/modules/cajas-mensuales/`
- `frontend/src/modules/suscriptores/`
- `frontend/src/modules/suscripciones/`
- `frontend/src/modules/cajas-mensuales/`

Esto garantiza alta cohesión dentro de cada feature, bajo acoplamiento entre módulos y facilita una futura transición hacia microservicios o servicios SOA livianos.

### 2.2. Arquitectura Multicapa en el Backend
Cada módulo backend implementa de forma estricta una separación de responsabilidades en tres capas:
1. **Capa de Presentación (`*.routes.ts`, `*.controller.ts`)**: Recibe peticiones HTTP, extrae parámetros del request, delega el trabajo al servicio correspondiente y devuelve respuestas JSON con códigos HTTP semánticos (200, 201, 400, 404, 500).
2. **Capa de Lógica de Negocio (`*.service.ts`)**: Implementa las reglas y validaciones de negocio del SaaS (onboarding de clientes, estados de membresía, curaduría de cajas). No tiene dependencia de objetos HTTP como `req` o `res`.
3. **Capa de Acceso a Datos y Dominio (`*.repository.ts`, `*.entity.ts`)**: Define las entidades mapeadas en la base de datos con TypeORM y abstrae las operaciones de persistencia mediante repositorios.

---

## 3. Patrones de Diseño Implementados

### 3.1. Patrón Repository / DAO
- **Ubicación**: `backend/src/common/interfaces/base-repository.interface.ts` y en cada módulo (`suscriptor.repository.ts`, `suscripcion.repository.ts`, `caja-mensual.repository.ts`).
- **Propósito**: Aislar la lógica de negocio de los detalles de la base de datos y de las consultas TypeORM. Permite cambiar el motor de persistencia o realizar pruebas unitarias con repositorios en memoria (mock) sin alterar los servicios.

### 3.2. Patrón Factory
- **Ubicación**: `backend/src/config/database.config.ts` (`DatabaseFactory`).
- **Propósito**: Construye y configura dinámicamente la instancia del `DataSource` de TypeORM según las variables de entorno (`DB_TYPE=sqlite` o `DB_TYPE=postgres`). Permite cambiar entre SQLite para desarrollo rápido local y PostgreSQL para entornos Docker o producción con una sola variable, sin modificar código fuente.

### 3.3. Patrón Strategy
- **Ubicación**: `backend/src/common/patterns/strategies/payment-strategy.interface.ts`.
- **Propósito**: Define una interfaz contractual unificada (`IPaymentStrategy`) para operaciones de facturación recurrente. Permite conectar indistintamente proveedores como Stripe o MercadoPago Subscriptions en etapas posteriores del TP sin acoplar el flujo de suscripciones a un SDK externo específico.

### 3.4. Patrón Observer (Event-Driven)
- **Ubicación**: `backend/src/common/patterns/events/event-dispatcher.ts` e `IDomainEvent`.
- **Propósito**: Implementa un despachador de eventos de dominio en memoria. Prepara la arquitectura para emitir eventos desacoplados como `PagoRecurrenteAprobado` que disparan la orden de empaque en la bodega física (`InventarioActualizado`), sentando la base para la posterior conexión con colas de mensajería (RabbitMQ / Kafka).

### 3.5. Patrón Facade
- **Ubicación**: `backend/src/common/patterns/facades/subscription-pack.facade.ts`.
- **Propósito**: Ofrece una interfaz simplificada de alto nivel (`SubscriptionPackFacade`) para orquestar flujos complejos que involucran múltiples subsistemas (validación de suscriptor, cobro recurrente, consulta de inventario SOAP y preparación del primer envío mensual).

---

## 4. Mapeo de Entidades con el Dominio ClubCurator

1. **Suscriptor (`Suscriptor`) [Cliente]**:
   - Campos: `id` (UUID), `nombre`, `email` (único), `telefono`, `preferenciasOrganolepticas` (JSON con categorías vinos/cafés/cervezas, perfiles de sabor, alergias/restricciones y notas de cata), `activo`, timestamps.
2. **Suscripción (`Suscripcion`) [Pedido Recurrente]**:
   - Campos: `id` (UUID), `suscriptorId` (Foreign Key con eliminación en cascada), `categoria`, `estado` (`activa`, `pausada`, `cancelada`), `montoMensual`, `fechaInicio`, `proximoCobro`, timestamps.
3. **CajaMensual (`CajaMensual`) [Producto]**:
   - Campos: `id` (UUID), `nombre`, `categoria`, `mes`, `anio`, `descripcion`, `precioBase`, `items` (JSON estructurado con botellas o variedades, productor/bodega y perfil de notas), `disponible`, timestamps.

---

## 5. Estructura de Directorios

```text
LeyLine/
├── .gitignore
├── docker-compose.yml
├── ARCHITECTURE.md
├── README.md
├── docs/
│   └── TP.md
├── backend/
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── migrations/
│       │   └── .gitkeep
│       ├── config/
│       │   ├── env.config.ts
│       │   └── database.config.ts
│       ├── common/
│       │   ├── errors/
│       │   │   └── app-error.ts
│       │   ├── utils/
│       │   │   └── logger.ts
│       │   ├── middlewares/
│       │   │   ├── error.middleware.ts
│       │   │   ├── logger.middleware.ts
│       │   │   └── validation.middleware.ts
│       │   ├── interfaces/
│       │   │   └── base-repository.interface.ts
│       │   └── patterns/
│       │       ├── events/
│       │       │   ├── domain-event.interface.ts
│       │       │   └── event-dispatcher.ts
│       │       ├── strategies/
│       │       │   └── payment-strategy.interface.ts
│       │       └── facades/
│       │           └── subscription-pack.facade.ts
│       └── modules/
│           ├── suscriptores/
│           │   ├── suscriptor.entity.ts
│           │   ├── suscriptor.repository.ts
│           │   ├── suscriptor.service.ts
│           │   ├── suscriptor.controller.ts
│           │   └── suscriptor.routes.ts
│           ├── suscripciones/
│           │   ├── suscripcion.entity.ts
│           │   ├── suscripcion.repository.ts
│           │   ├── suscripcion.service.ts
│           │   ├── suscripcion.controller.ts
│           │   └── suscripcion.routes.ts
│           └── cajas-mensuales/
│               ├── caja-mensual.entity.ts
│               ├── caja-mensual.repository.ts
│               ├── caja-mensual.service.ts
│               ├── caja-mensual.controller.ts
│               └── caja-mensual.routes.ts
│
└── frontend/
    ├── .env.example
    ├── .env
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
        │   └── components/
        │       └── AppNavbar.vue
        └── modules/
            ├── suscriptores/
            │   ├── views/SuscriptoresView.vue
            │   ├── services/suscriptores.service.ts
            │   └── store/suscriptores.store.ts
            ├── suscripciones/
            │   ├── views/SuscripcionesView.vue
            │   ├── services/suscripciones.service.ts
            │   └── store/suscripciones.store.ts
            └── cajas-mensuales/
                ├── views/CajasMensualesView.vue
                ├── services/cajas-mensuales.service.ts
                └── store/cajas-mensuales.store.ts
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

1. En `backend/.env`, configurar:
   ```env
   DB_TYPE=sqlite
   DB_SQLITE_PATH=clubcurator.sqlite
   DB_SYNCHRONIZE=true
   DB_LOGGING=true
   ```
2. Iniciar el Backend:
   ```bash
   cd backend
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
2. En `backend/.env`, asegúrate de tener:
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
3. Ejecuta las migraciones o sincronización y levanta el servidor backend con `npm run dev`.

---

### 6.5. Gestión de Migraciones con TypeORM
Para mantener el historial de cambios en el esquema de base de datos de PostgreSQL a medida que evolucionen las entidades:

1. **Generar una migración automáticamente a partir de cambios en las entidades**:
   Compara las entidades de TypeScript contra el esquema actual de PostgreSQL y genera el archivo SQL correspondiente en `src/migrations/`:
   ```bash
   cd backend
   npm run migration:generate -- src/migrations/NombreDelCambio
   ```
   *(Ejemplo: `npm run migration:generate -- src/migrations/InitialSchema`)*

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

## 7. Lineamientos para la Implementación de Código

Cuando comiences a desarrollar la lógica de negocio, se recomienda seguir este flujo para mantener la arquitectura limpia:

1. **Definir modelos y contratos**: Modificar o ampliar las columnas en `*.entity.ts` dentro de `src/modules/[feature]/`.
2. **Operaciones de persistencia**: Agregar consultas personalizadas o métodos especializados en `*.repository.ts`.
3. **Reglas de negocio**: Implementar algoritmos, validaciones y cálculos en `*.service.ts`. Aquí es donde se conectará en el futuro el recomendador de IA y el cliente SOAP.
4. **Exposición de endpoints**: Conectar los nuevos métodos en `*.controller.ts` y mapear sus rutas HTTP en `*.routes.ts`.
5. **Consumo en Frontend**:
   - Declarar el método en `src/modules/[feature]/services/[feature].service.ts`.
   - Gestionar el estado reactivo en `src/modules/[feature]/store/[feature].store.ts` con Pinia.
   - Enlazar la vista en `src/modules/[feature]/views/[feature]View.vue`.
