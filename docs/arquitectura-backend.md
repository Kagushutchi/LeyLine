# Decisiones de Arquitectura del Backend

Esta página documenta cómo está construido el backend actual y qué responsabilidad tiene cada pieza. Los diagramas reflejan el código real; cuando un patrón está preparado pero todavía no tiene una integración concreta, se indica explícitamente.

Para el modelo de clases y las operaciones expuestas por cada módulo, ver el [diagrama de clases](diagrama-de-clases.md).

## 1. Composición general: monolito modular

Se eligió un monolito modular porque todas las funcionalidades comparten proceso y persistencia, pero se mantienen separadas por dominio.

```mermaid
flowchart LR
    C[Cliente / Frontend] --> API[Express API]

    API --> M["Módulos"]
    M --> U[Casos de uso]
    U --> R[Repositorios]
    R --> T[ORM]
    T --> DB[(SQLite / PostgreSQL)]
```

La ventaja es poder evolucionar cada módulo sin pagar todavía el costo operativo de varios servicios desplegables.

## 2. Cómo se construye un dominio

Cada feature se organiza como un vertical slice: la entrada HTTP, la lógica de aplicación y la persistencia viven dentro del mismo módulo.

```mermaid
flowchart TB
    subgraph D[Dominio]
        RT[Router] --> CT[Controller]
        CT --> UC[Use case]
        UC --> RP[Repository]
        RP --> EN[Entity]
    end

    EN --> ORM[ORM]
    ORM --> DB[(Base de datos)]
```

Ejemplo real para `cajas-mensuales`:

- `presentation/`: router y controller.
- `domain/useCase/`: altas, bajas, modificaciones, consultas y recomendación.
- `infrastructure/`: entidad ORM y repository.

El controller no contiene reglas de negocio: traduce la request y delega en un caso de uso. El repository concentra las consultas y el mapeo hacia ORM.

## 3. Ciclo de una request

La aplicación aplica middlewares globales antes de resolver las rutas y centraliza los errores al final del pipeline.

```mermaid
sequenceDiagram
    participant C as Cliente
    participant E as Express
    participant M as Middlewares
    participant R as Router/Controller
    participant U as Use case
    participant P as Repository
    participant DB as DB

    C->>E: HTTP request
    E->>M: CORS + JSON + logger
    M->>R: Request válida
    R->>U: execute(...)
    U->>P: Consulta o persistencia
    P->>DB: ORM
    DB-->>P: Resultado
    P-->>U: Entidad / datos
    U-->>R: Resultado de negocio
    R-->>C: JSON response
```

Si una etapa lanza un `AppError` u otra excepción, `errorHandlerMiddleware` transforma el error en una respuesta HTTP consistente.

## 4. Persistencia intercambiable

La base se selecciona mediante `DB_TYPE`, sin modificar los módulos de negocio.

```mermaid
flowchart LR
    ENV[DB_TYPE] --> F[DatabaseFactory]
    F -->|sqlite| DS[AppDataSource única]
    F -->|postgres| DS
    DS --> E[Entidades registradas]
    DS --> DB[(SQLite / PostgreSQL)]
    REP[Repositorios] -->|getDataSource()| DS
```

Existe **una única** instancia de `DataSource` creada por `DatabaseFactory` en `config/database.config.ts`. Los repositorios no crean conexiones propias: acceden a la conexión activa mediante `getDataSource()`. Esto permite usar SQLite para desarrollo local y PostgreSQL para un entorno más cercano a producción sin modificar los módulos de negocio.

## 5. Patrones que desacoplan decisiones

```mermaid
flowchart LR
    UC[Casos de uso] --> REP[Repository]
    REP --> DB[Persistencia]

    F[Factory] --> DB
    STR[Strategy de pagos] -. extensión futura .-> PAY[Stripe / MercadoPago]
    EVT[EventDispatcher] -. evento SuscripcionActivada .-> SOAP[Reserva de stock SOAP]
    FAC[SubscriptionPackFacade] -- orquesta --> EVT
    FAC -- orquesta --> STR
```

| Decisión | Responsabilidad | Estado actual |
|---|---|---|
| Repository | Aislar consultas y persistencia | Implementado |
| Factory | Elegir SQLite o PostgreSQL | Implementado |
| Strategy | Permitir proveedores de pago intercambiables | Implementado (`createPaymentStrategy()`; `none`/`fake`/`stripe`) |
| Observer / EventDispatcher | Desacoplar eventos de dominio | Implementado; listener real registrado por `SubscriptionPackFacade` (reserva de stock por SOAP) |
| Facade | Orquestar suscripción, pago, inventario y despacho | Implementado (`SubscriptionPackFacade.activateSubscriptionAndPrepareFirstBox`) |

## 6. Regla de dependencia

```mermaid
flowchart BT
    INF[Infrastructure: ORM + DB] --> APP[Application: casos de uso]
    PRES[Presentation: HTTP] --> APP
    APP --> DOM[Reglas del dominio]
```

La dirección buscada es que HTTP y ORM sean detalles externos. Las reglas de negocio deben vivir en los casos de uso y no depender de `Request`, `Response` ni de consultas SQL directas.

## 7. Contratos REST y SOAP

La API REST se documenta con OpenAPI 3.0.3 desde un objeto central en `src/config/openapi.ts`. La aplicación sirve Swagger UI en `/api/docs` y el JSON en `/api/docs.json`; además, `npm run openapi:export` genera `docs/openapi.json` para versionar el contrato.

El inventario se expone como servicio SOAP dentro del mismo proceso Express:

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as Express /api/suscripciones
    participant UC as CreateSuscripcion
    participant SC as InventarioSoapClient
    participant SOAP as Servicio SOAP
    participant DB as stock_productos

    C->>API: POST /api/suscripciones
    API->>UC: execute(dto)
    UC->>SC: consultarInventario(productoId)
    SC->>SOAP: POST /soap/inventario
    SOAP->>DB: SELECT stock
    DB-->>SOAP: cantidadDisponible
    SOAP-->>SC: inventario
    alt stock suficiente
        SC-->>UC: ok
        UC-->>API: suscripción creada
        API-->>C: 201
    else stock insuficiente
        SC-->>UC: faltante
        UC-->>API: AppError 409
        API-->>C: 409
    end
```

- `src/modules/inventario/soap/`: WSDL embebido, servicio y arranque del endpoint `/soap/inventario`.
- `src/modules/inventario/client/`: cliente SOAP con timeout usado por el alta de suscripciones.
- `src/modules/inventario/infrastructure/`: entidad `StockProducto` y repositorio.
- Variables: `SOAP_INVENTARIO_ENABLED`, `SOAP_INVENTARIO_URL`, `SOAP_TIMEOUT_MS`.

El contrato y los ejemplos de invocación están en [contratos-servicios.md](contratos-servicios.md).
