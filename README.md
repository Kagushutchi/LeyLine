
![LeyLine](/docs/LeyLine.png)
# ClubCurator | Plataforma SaaS de Clubes de Suscripción

> **SaaS llave en mano** para que creadores de marcas de nicho (vinos, cafés o cervezas artesanales) puedan lanzar y automatizar clubes de membresías mensuales con envíos personalizados.

---

## Componentes del Proyecto (Trabajo Práctico)

- **Entidades de Dominio**: Suscripción (Pedido), Suscriptor (Cliente), CajaMensual (Producto), Producto e Inventario (`StockProducto`).
- **Servicio SOAP**: Consulta y reserva de inventario en tiempo real (`consultarInventario`, `reservarStock`, `actualizarInventario`) para bodegas, tostaderos o productores asociados. Se expone en `/soap/inventario?wsdl`.
- **Servicios REST**: Registro de preferencias organolépticas (sabores preferidos, alergias) y dashboard de membresía.
- **Colas de Mensajería (RabbitMQ / Kafka)**: Evento `PagoRecurrenteAprobado` $\rightarrow$ Dispara la generación de la orden de empaque en la bodega física (`InventarioActualizado`).
- **API Externa**: Stripe o MercadoPago Subscriptions para la facturación automática recurrente.
- **Componente de IA**: Modelo de recomendación personalizado que arma la combinación óptima de botellas o variedades que recibirá el suscriptor en su caja mensual según sus valoraciones y preferencias previas.

---

## Documentación de Arquitectura y Scaffolding

Para ver la explicación detallada de la arquitectura modular, patrones de diseño aplicados (Repository, Factory, Strategy, Observer, Facade), configuración de persistencia dual (SQLite / PostgreSQL) y guía de ejecución local o con Docker, consulta el archivo:

**[ARCHITECTURE.md](ARCHITECTURE.md)**

Los contratos REST y SOAP, con ejemplos de invocación, están documentados en:

**[docs/contratos-servicios.md](docs/contratos-servicios.md)**

El plan de trabajo, el estado de avance y las tareas pendientes se mantienen en:

**[docs/pasos-a-seguir.md](docs/pasos-a-seguir.md)**

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
Requiere `Backend/.env` configurado (ver `Backend/.env.example`: cola y pagos) y `frontend/.env` con `VITE_SUBSCRIPTION_REQUESTS_ENABLED=true`.
Con `PAYMENT_PROVIDER=stripe` hace falta el [Stripe CLI](https://docs.stripe.com/stripe-cli) con `stripe login`; el script avisa si
`STRIPE_WEBHOOK_SECRET` no coincide con el de `stripe listen`. Detalle del flujo de pagos en [docs/pagos-recurrentes.md](docs/pagos-recurrentes.md).

### 4. Todo en Docker (sin comandos manuales)

Con Docker alcanza, sin instalar Node ni correr nada a mano:

```bash
cp Backend/.env.example Backend/.env   # una sola vez; completar las claves de pago si se usa Stripe
```

```bash
docker compose up --build
```

(o `npm run up` desde la raíz). Levanta PostgreSQL, RabbitMQ, la **API**, el **worker**, el **seed** de datos de ejemplo (una sola vez; no duplica),
el **frontend** (`http://localhost:5173`, con recarga en caliente de `frontend/src`) y el reenvío de webhooks de **Stripe**.

- Dentro de Docker la API y el worker siempre corren con la cola y las solicitudes habilitadas y apuntan a los contenedores `postgres` y `rabbitmq`; el resto de la configuración sale de `Backend/.env`.
- El contenedor `stripe` solo actúa con `PAYMENT_PROVIDER=stripe`; con `fake` o `none` termina sin error. Necesita `STRIPE_SECRET_KEY`: una clave `sk_test_...`, o una restringida con el permiso **Debugging Tools: Write**. Si `STRIPE_WEBHOOK_SECRET` no coincide con el que obtiene el contenedor, lo avisa en su log con el valor correcto.
- Cambios en el backend requieren `docker compose up --build`; el frontend los toma solo.
- No uses a la vez `npm run dev` y Docker: ocupan los mismos puertos (3000, 5173).
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

El workflow de CI en `.github/workflows/ci.yml` ejecuta `lint`, `typecheck` y `test` en cada push y pull request.