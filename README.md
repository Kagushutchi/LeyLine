
![LeyLine](/docs/LeyLine.png)
# ClubCurator | Plataforma SaaS de Clubes de Suscripción

> **SaaS llave en mano** para que creadores de marcas de nicho (vinos, cafés o cervezas artesanales) puedan lanzar y automatizar clubes de membresías mensuales con envíos personalizados.

---

## Componentes del Proyecto (Trabajo Práctico)

- **Entidades de Dominio**: Suscripción (Pedido), Suscriptor (Cliente), CajaMensual (Producto), Producto e Inventario (`StockProducto`).
- **Servicio SOAP**: Consulta y reserva de inventario en tiempo real (`consultarInventario`, `reservarStock`, `actualizarInventario`) para bodegas, tostaderos o productores asociados. Se expone en `/soap/inventario?wsdl`.
- **Servicios REST**: Registro de preferencias organolépticas (sabores preferidos, alergias) y dashboard de membresía.
- **Colas de Mensajería (RabbitMQ)**: Patrón outbox/inbox en `modules/solicitudes-suscripcion`. El evento de alta de suscripción dispara el cobro recurrente (Strategy) y, una vez aprobado, la actualización de inventario.
- **API Externa de Pagos**: Stripe Subscriptions (patrón Strategy) para la facturación automática recurrente, con checkout, webhooks propios y reconciliación de eventos. `FakePaymentStrategy` disponible para demos/tests sin red.
- **Componente de IA**: recomendador basado en DeepSeek (`DeepSeekRecommendationClient`, API compatible con OpenAI, `response_format: json_object`) con 3 endpoints reales: recomendación personalizada por suscriptor, recomendación agregada para el club y selección entre cajas ya existentes. Con tests dedicados (`Backend/tests/ai-recommendations.test.ts`) que mockean el modelo.
- **Patrones de diseño implementados**: Repository, Factory (`DatabaseFactory`) y Strategy (pagos) están aplicados y usados en producción. Observer (`EventDispatcher`) y Facade (`SubscriptionPackFacade`) están **con la estructura preparada pero sin implementar** — ver [Alcance de esta entrega](#alcance-y-limitaciones-de-esta-entrega) más abajo.

---

## Documentación de Arquitectura y Scaffolding

Para ver la explicación detallada de la arquitectura modular, patrones de diseño aplicados (Repository, Factory, Strategy; Observer y Facade como estructura preparada), configuración de persistencia dual (SQLite / PostgreSQL) y guía de ejecución local o con Docker, consulta el archivo:

**[ARCHITECTURE.md](ARCHITECTURE.md)**

Los contratos REST y SOAP, con ejemplos de invocación, están documentados en:

**[docs/contratos-servicios.md](docs/contratos-servicios.md)**

El plan de trabajo, el estado de avance y las tareas pendientes se mantienen en:

**[docs/pasos-a-seguir.md](docs/pasos-a-seguir.md)** y **[docs/pendientes-tp2.md](docs/pendientes-tp2.md)** (este último, específico de la Segunda Parte del TP).

---

## Variables de entorno

Las variables de `Backend/.env` controlan qué partes del sistema quedan activas. Partí siempre de `Backend/.env.example`:

```bash
cd Backend
cp .env.example .env
```

### Obligatorias para levantar la API (cualquier modo)

| Variable | Para qué sirve | De dónde sale |
|---|---|---|
| `DB_TYPE` | `sqlite` (sin dependencias) o `postgres` (Docker/migraciones) | elegís según el modo (ver [Inicio Rápido](#inicio-rápido)) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Firma de tokens de acceso/refresh | cualquier string largo; el `.env.example` trae uno de desarrollo, cambialo si vas a exponer el backend |
| `SOAP_INVENTARIO_ENABLED` | Habilita el servicio SOAP de inventario | `true` para desarrollo normal |

### Solo si usás la cola de suscripciones (worker, `recomendar`-flujo de alta con pago)

| Variable | Para qué sirve | De dónde sale |
|---|---|---|
| `RABBITMQ_URL` | Conexión al broker | `docker compose up -d` ya expone RabbitMQ en `localhost:5672`; con Docker completo, `npm run dev`/`docker compose up` lo configuran solos |
| `QUEUE_RUNTIME_ENABLED` | Prende el worker (relay/consumidores/reconciler) | `true` |
| `SUBSCRIPTION_REQUESTS_ENABLED` | Monta `POST/GET /api/solicitudes-suscripcion` | `true` |

### Solo si usás pagos recurrentes reales (`PAYMENT_PROVIDER=stripe`)

| Variable | Para qué sirve | De dónde sale |
|---|---|---|
| `PAYMENT_PROVIDER` | `none` (alta sin cobro) / `fake` (demo/tests sin red) / `stripe` | elegís según lo que necesites probar |
| `STRIPE_SECRET_KEY` | Clave privada de Stripe en modo test | [dashboard de Stripe](https://dashboard.stripe.com/test/apikeys) → *Developers → API keys* → `sk_test_...` (o una restringida con permiso **Debugging Tools: Write**) |
| `STRIPE_WEBHOOK_SECRET` | Firma los webhooks entrantes de Stripe | **se obtiene corriendo Docker/`stripe listen`, no se inventa**: con `docker compose up`, mirá el log del contenedor `stripe` (`docker compose logs stripe` o `npm run logs`) — imprime el valor correcto si no coincide con el de tu `.env`; en modo manual, `stripe listen --forward-to localhost:3000/api/webhooks/payments` lo imprime al arrancar. **Cambia cada vez que volvés a levantar el contenedor/CLI**, así que revisalo de nuevo si los webhooks empiezan a dar 400 |
| `PAYMENT_BASE_CURRENCY` / `PAYMENT_CURRENCY` / `PAYMENT_FX_RATE` | Moneda de los precios vs. moneda de cobro | fijo, definido por el equipo (ver `docs/pagos-recurrentes.md`) |

### Solo si usás el recomendador de IA (`/api/cajas-mensuales/recomendar*`)

| Variable | Para qué sirve | De dónde sale |
|---|---|---|
| `DEEPSEEK_API_KEY` | Autentica contra la API de DeepSeek | [platform.deepseek.com](https://platform.deepseek.com/api_keys) → crear API key. **Sin esta variable, los 3 endpoints de recomendación responden 400** (no hay fallback silencioso) |
| `DEEPSEEK_MODEL` | Modelo a usar | `deepseek-chat` funciona bien; el `.env.example` ya lo trae |
| `DEEPSEEK_BASE_URL` | Endpoint de la API | `https://api.deepseek.com`, no suele cambiar |

> El resto de las variables (`PORT`, `CORS_ORIGIN`, datos de PostgreSQL, timeouts de la cola, etc.) tienen valores por defecto razonables en `.env.example` y casi nunca hace falta tocarlos para desarrollo local.

---

## Inicio Rápido

### 1. Con SQLite (Desarrollo local sin dependencias externas)
```bash
# Terminal 1 - Backend
cd Backend
cp .env.example .env
npm install
npm run seed   # opcional: carga datos de prueba
npm run dev

# Terminal 2 - Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000` (Healthcheck: `http://localhost:3000/api/health`)
- Swagger UI: `http://localhost:3000/api/docs`
- Contrato OpenAPI: `http://localhost:3000/api/docs.json`
- WSDL SOAP: `http://localhost:3000/soap/inventario?wsdl`

> En este modo, la cola, los pagos y la IA quedan efectivamente deshabilitados salvo que completes sus variables (ver [Variables de entorno](#variables-de-entorno)) — la API funciona igual, pero `/api/cajas-mensuales/recomendar*` responde 400 sin `DEEPSEEK_API_KEY`, y el alta de suscripción con cobro real necesita la cola + Stripe.

### 2. Con PostgreSQL 16 en Docker (Para desarrollo y migraciones)
```bash
# 1. Iniciar el contenedor de PostgreSQL 16 en segundo plano
docker compose up -d

# 2. Configurar DB_TYPE=postgres en Backend/.env y ejecutar migraciones
cd Backend
cp .env.example .env
# editar .env: DB_TYPE=postgres, DB_SYNCHRONIZE=false
npm install
npm run migration:run
npm run seed   # opcional: carga datos de prueba
npm run dev

# 3. En otra terminal, iniciar frontend
cd frontend
npm run dev
```

### 3. Todo el entorno con un solo comando (cola + pagos + frontend)

Desde la raíz del repositorio, una sola vez:

```bash
npm run init:all
```

y luego:

```bash
npm run dev
```

Levanta, en una sola terminal con la salida prefijada por proceso:

| Prefijo | Qué corre |
|---|---|
| `[infra]` | `docker compose up -d --wait` (PostgreSQL + RabbitMQ) y sus logs |
| `[api]` | `npm run dev` del Backend |
| `[worker]` | `npm run worker` (relay, consumidores y reconciliador de la cola) |
| `[stripe]` | `stripe listen` hacia `/api/webhooks/payments` (sólo si `PAYMENT_PROVIDER=stripe`) |
| `[web]` | `npm run dev` del frontend |

`npm run dev:backend` hace lo mismo sin el frontend y `npm run dev:down` baja los contenedores.
Requiere `Backend/.env` configurado (ver [Variables de entorno](#variables-de-entorno)) y `frontend/.env` con `VITE_SUBSCRIPTION_REQUESTS_ENABLED=true`.
Con `PAYMENT_PROVIDER=stripe` hace falta el [Stripe CLI](https://docs.stripe.com/stripe-cli) con `stripe login`; el script avisa si
`STRIPE_WEBHOOK_SECRET` no coincide con el de `stripe listen`. Detalle del flujo de pagos en [docs/pagos-recurrentes.md](docs/pagos-recurrentes.md).

### 4. Todo en Docker (sin comandos manuales)

Con Docker alcanza, sin instalar Node ni correr nada a mano:

```bash
cp Backend/.env.example Backend/.env   # una sola vez; completar las claves de pago/IA (ver "Variables de entorno")
```

```bash
docker compose up --build
```

(o `npm run up` desde la raíz). Levanta PostgreSQL, RabbitMQ, la **API**, el **worker**, el **seed** de datos de ejemplo (una sola vez; no duplica),
el **frontend** (`http://localhost:5173`, con recarga en caliente de `frontend/src`) y el reenvío de webhooks de **Stripe**.

- Dentro de Docker la API y el worker siempre corren con la cola y las solicitudes habilitadas y apuntan a los contenedores `postgres` y `rabbitmq`; el resto de la configuración sale de `Backend/.env`.
- El contenedor `stripe` solo actúa con `PAYMENT_PROVIDER=stripe`; con `fake` o `none` termina sin error. Necesita `STRIPE_SECRET_KEY`: una clave `sk_test_...`, o una restringida con el permiso **Debugging Tools: Write**. Si `STRIPE_WEBHOOK_SECRET` no coincide con el que obtiene el contenedor, lo avisa en su log con el valor correcto (`docker compose logs stripe` o `npm run logs`).
- El recomendador de IA necesita `DEEPSEEK_API_KEY` en `Backend/.env` **antes** de levantar la API/worker; si lo agregás después, hace falta reiniciar esos contenedores (`docker compose up --build api worker`) para que lean el valor nuevo.
- Cambios en el backend requieren `docker compose up --build`; el frontend los toma solo.
- No uses a la vez `npm run dev` y Docker: ocupan los mismos puertos (3000, 5173).
- **Windows**: abrí Docker Desktop y esperá a que diga "Engine running" antes de `docker compose up` (si no, falla con `open //./pipe/dockerDesktopLinuxEngine`); verificá con `docker version`. Se necesita WSL 2. En Windows usá el modo Docker: `npm run dev` requiere `bash` (Git Bash o WSL) para el script de Stripe. El `.gitattributes` fuerza saltos de línea LF en los `.sh`; si ya clonaste antes de tenerlo, corré `git add --renormalize .` o volvé a clonar.
- `npm run logs` sigue los logs; `docker compose down` apaga todo (los datos quedan en volúmenes).

> **Nota:** las migraciones iniciales y de inventario ya están versionadas en `Backend/src/migrations/`. Si cambiás entidades, generá una nueva con
> `npm run migration:generate -- src/migrations/NombreDelCambio` y aplicala con `npm run migration:run`.

Para regenerar el contrato OpenAPI exportado:

```bash
cd Backend
npm run openapi:export
```

---

## Calidad y Pruebas

Ambos proyectos exponen los mismos comandos:

```bash
npm run lint        # ESLint
npm run format      # Prettier (escribe)
npm run typecheck   # tsc / vue-tsc sin emitir
npm test            # Vitest (unitarias + integración)
```

El Backend incluye, entre otros, tests de pagos (`test/payments.test.cjs`, Strategy + webhooks) y del componente de IA
(`tests/ai-recommendations.test.ts`: los 3 casos de uso de recomendación y `DeepSeekRecommendationClient`, con el modelo
mockeado — nunca llaman a la red real). El workflow de CI en `.github/workflows/ci.yml` ejecuta `lint`, `typecheck` y `test`
en cada push y pull request.

---

## Alcance y limitaciones de esta entrega

Decisión del equipo para la Segunda Entrega del TP: **no se implementa el patrón Facade** (`SubscriptionPackFacade`,
`Backend/src/common/patterns/facades/subscription-pack.facade.ts`). Hoy sigue devolviendo
`ACTIVATION_PENDING_IMPLEMENTATION`; todo lo que necesitaría orquestar (alta de suscripción, SOAP de inventario, cobro
Strategy, cola RabbitMQ) ya existe y funciona de forma independiente a través de los flujos reales (`POST /api/suscripciones`,
`POST /api/solicitudes-suscripcion`), así que no bloquea ninguna funcionalidad — queda como deuda técnica documentada, no
como una feature rota. En consecuencia:

- El patrón **Observer** (`EventDispatcher`, en memoria) tampoco tiene ningún `.subscribe()`/`.dispatch()` real conectado.
- Las operaciones SOAP `reservarStock` y `actualizarInventario` siguen expuestas en el WSDL pero sin ningún caller en el código (solo `consultarInventario` se usa, desde el alta de suscripción).

El detalle y la justificación completa están en [docs/pendientes-tp2.md](docs/pendientes-tp2.md).
