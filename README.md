
![LeyLine](/docs/LeyLine.png)
# ClubCurator | Plataforma SaaS de Clubes de Suscripción

> **SaaS llave en mano** para que creadores de marcas de nicho (vinos, cafés o cervezas artesanales) puedan lanzar y automatizar clubes de membresías mensuales con envíos personalizados.

---

## Componentes del Proyecto (Trabajo Práctico)

- **Entidades de Dominio**: Suscripción (Pedido), Suscriptor (Cliente), CajaMensual (Producto).
- **Servicio SOAP**: Consulta de inventarios en tiempo real para las bodegas, tostaderos o productores asociados.
- **Servicios REST**: Registro de preferencias organolépticas (sabores preferidos, alergias) y dashboard de membresía.
- **Colas de Mensajería (RabbitMQ / Kafka)**: Evento `PagoRecurrenteAprobado` $\rightarrow$ Dispara la generación de la orden de empaque en la bodega física (`InventarioActualizado`).
- **API Externa**: Stripe o MercadoPago Subscriptions para la facturación automática recurrente.
- **Componente de IA**: Modelo de recomendación personalizado que arma la combinación óptima de botellas o variedades que recibirá el suscriptor en su caja mensual según sus valoraciones y preferencias previas.

---

## Documentación de Arquitectura y Scaffolding

Para ver la explicación detallada de la arquitectura modular, patrones de diseño aplicados (Repository, Factory, Strategy, Observer, Facade), configuración de persistencia dual (SQLite / PostgreSQL) y guía de ejecución local o con Docker, consulta el archivo:

**[ARCHITECTURE.md](ARCHITECTURE.md)**

---

## Inicio Rápido

### 1. Con SQLite (Desarrollo local sin dependencias externas)
```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000` (Healthcheck: `http://localhost:3000/api/health`)

### 2. Con PostgreSQL 16 en Docker (Para desarrollo y migraciones)
```bash
# 1. Iniciar el contenedor de PostgreSQL 16 en segundo plano
docker compose up -d

# 2. Configurar DB_TYPE=postgres en backend/.env y ejecutar migraciones
cd backend
npm run migration:run
npm run dev

# 3. En otra terminal, iniciar frontend
cd frontend
npm run dev
```