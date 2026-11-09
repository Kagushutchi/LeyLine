
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