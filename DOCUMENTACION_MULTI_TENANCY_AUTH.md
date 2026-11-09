# Documentación Técnica: Autenticación Multi-Tenancy y RBAC

**Proyecto:** ClubCurator SaaS (Monolito Modular - Express, TypeORM, Vue 3, Pinia)  
**Fecha:** 2026-11-08  
**Rama:** `feature/soft-delete`

---

## 1. Resumen Ejecutivo de la Implementación

Se ha diseñado e implementado una arquitectura integral de **autenticación multi-tenancy** con **control de acceso basado en roles (RBAC)** y **manejo de tokens JWT (Access & Refresh)** para la plataforma SaaS ClubCurator.

### Requisitos Cumplidos
1. **Lógica de perfiles con dos roles bien diferenciados:**
   - **`admin` (Dueño de Bodega / Inquilino):** Representa a los propietarios de bodegas, tostaderos de café o cervecerías artesanales. Dispone de permisos CRUD completos sobre el catálogo y suscripciones de su inquilino.
   - **`subscriptor` (Cliente / Consumidor Final):** Miembro del club de suscripción. Tiene acceso de solo lectura al catálogo de cajas disponibles y a la gestión de su suscripción personal, sin permisos de administración, creación ni borrado.
2. **Requisitos de registro por rol:**
   - **Registro de Administrador:** Requiere `nombreNegocio`, `email`, `password`, `username`.
   - **Registro de Subscriptor:** Requiere `email`, `username`, `nombre`, `apellido`, `password`.
3. **Manejo de tokens JWT (Access y Refresh):**
   - Emisión y verificación de pares de tokens.
   - Persistencia segura del refresh token en base de datos.
   - Interceptores automáticos en Axios (`http-client.ts`) para inyección de token y refresco transparente ante respuestas HTTP 401.
4. **Aislamiento Multi-Tenant de datos:**
   - Entidad `Tenant` y asignación de `tenantId` a entidades de dominio (`productos`, `cajas_mensuales`, `suscripciones`).
   - Filtrado automático en repositorios TypeORM según el inquilino autenticado.
   - Middleware `tenantScopeMiddleware` que asegura que los administradores solo puedan operar sobre su propio *tenant*.
5. **Navegación y Vistas diferenciadas en Frontend:**
   - Guards globales de navegación en Vue Router según estado de autenticación y rol.
   - Vistas de `LoginView.vue`, `RegisterView.vue` y `CatalogoView.vue` con el sistema de diseño de lujo.
   - Navbar reactivo que adapta sus enlaces y muestra badges según el rol activo.
6. **Documentación y Skill:**
   - Skill estructurada creada en `.agents/skills/saas-multitenancy-auth/SKILL.md`.
   - Documento consolidado en este archivo.

---

## 2. Cambios en Backend (`Backend/`)

### Dependencias Instaladas
- `jsonwebtoken` y `@types/jsonwebtoken`: Para firma y validación de tokens JWT.
- `bcryptjs` y `@types/bcryptjs`: Para hashing seguro de contraseñas y refresh tokens.

### Archivos Creados en Backend

| Archivo | Capa / Módulo | Propósito |
| :--- | :--- | :--- |
| `src/common/interfaces/auth.interface.ts` | Common / Interfaces | Declaración de roles (`UserRole = 'admin' \| 'subscriptor'`), payload JWT (`JwtPayload`) y ampliación de tipos de Express (`Request.user`). |
| `src/common/utils/jwt.ts` | Common / Utils | Clase `JwtUtils` para generación/verificación de Access Tokens y Refresh Tokens, y funciones de hash/compare para contraseñas con bcrypt. |
| `src/common/middlewares/auth.middleware.ts` | Common / Middlewares | `authMiddleware` (exige token Bearer) y `optionalAuthMiddleware` (permite continuar con o sin token). |
| `src/common/middlewares/roles.middleware.ts` | Common / Middlewares | `requireRole(allowedRoles)`: Retorna 403 Forbidden si el rol del usuario no está autorizado. |
| `src/common/middlewares/tenant.middleware.ts` | Common / Middlewares | `tenantScopeMiddleware`: Inyecta el `tenantId` del admin en el payload de creación para evitar suplantaciones. |
| `src/modules/auth/infrastructure/tenant.entity.ts` | Auth / Infrastructure | Entidad TypeORM `Tenant` (`tenants`), almacena nombre, slug, plan y estado. |
| `src/modules/auth/infrastructure/user.entity.ts` | Auth / Infrastructure | Entidad TypeORM `User` (`users`), gestiona credenciales, rol, refreshToken y FK `tenantId`. |
| `src/modules/auth/infrastructure/tenant-repository.ts` | Auth / Infrastructure | Repositorio `TenantRepository` con métodos `findBySlug` y `findByNombre`. |
| `src/modules/auth/infrastructure/user-repository.ts` | Auth / Infrastructure | Repositorio `UserRepository` con búsquedas por email, username o identificador combinado, y actualización de refresh tokens. |
| `src/modules/auth/domain/useCase/register-admin.ts` | Auth / Domain | Caso de uso para registrar una bodega (`Tenant`) y su primer usuario con rol `admin`. |
| `src/modules/auth/domain/useCase/register-subscriptor.ts` | Auth / Domain | Caso de uso para registrar un usuario cliente con rol `subscriptor` y crear su ficha en `suscriptores`. |
| `src/modules/auth/domain/useCase/login.ts` | Auth / Domain | Caso de uso de login por correo o username, con validación de contraseña y generación de tokens. |
| `src/modules/auth/domain/useCase/refresh-token.ts` | Auth / Domain | Caso de uso para rotación y renovación de tokens mediante Refresh Token. |
| `src/modules/auth/domain/useCase/logout.ts` | Auth / Domain | Invalida el refresh token persistido del usuario. |
| `src/modules/auth/domain/useCase/get-current-user.ts` | Auth / Domain | Recupera perfil del usuario autenticado incluyendo datos de su inquilino. |
| `src/modules/auth/presentation/controller.ts` | Auth / Presentation | `AuthController` que orquesta los casos de uso de autenticación. |
| `src/modules/auth/presentation/auth-router.ts` | Auth / Presentation | Router Express que expone los endpoints en `/api/auth`. |
| `src/migrations/1795000000000-AddAuthAndMultiTenancy.ts` | Migraciones | Migración segura e idempotente que crea las tablas `tenants` y `users`, agrega `tenantId` a `productos`, `cajas_mensuales` y `suscripciones`, e inserta semillas iniciales. |

### Archivos Modificados en Backend

1. **`src/config/env.config.ts`**: Incorporación de variables para JWT:
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `JWT_EXPIRES_IN` (defecto: `15m`)
   - `JWT_REFRESH_EXPIRES_IN` (defecto: `7d`)
2. **`.env` y `.env.example`**: Agregadas las variables de entorno de JWT y configurado `DB_SQLITE_PATH=clubcurator_db`.
3. **`src/common/patterns/factory/entities.ts`**: Registradas las entidades `Tenant` y `User`.
4. **`src/common/patterns/factory/sqlite-typeorm.ts` y `postgres-typeorm.ts`**: Integrada la migración `AddAuthAndMultiTenancy1795000000000` en la lista de migraciones automáticas.
5. **`src/app.ts`**: Montado el router de autenticación en `/api/auth`.
6. **`src/server.ts`**: Refactorizado para utilizar la conexión única de base de datos proveniente de `app.ts`.
7. **Entidades y Repositorios de Dominio (`productos`, `cajas-mensuales`, `suscripciones`, `suscriptores`)**:
   - Agregada columna `tenantId` en entidades `Producto`, `CajaMensual`, `Suscripcion` y `Suscriptor`.
   - **Aislamiento Multi-Tenant Estricto por Inquilino:**
     - En `SuscriptorRepository`: `findAll(tenantId)` y `findOneById(id, tenantId)` aíslan estrictamente la cartera de clientes. Un administrador solo ve, crea, modifica o elimina suscriptores de su propio negocio. Un administrador de otra bodega recibe HTTP 404 si intenta modificar o borrar un suscriptor ajeno.
     - En `SuscripcionRepository`: `findAll(tenantId, suscriptorId)` filtra por `tenantId` para administradores y por `suscriptorId` para clientes finales.
     - En `ProductoRepository` y `CajaMensualRepository`: filtrado estricto por `tenantId = :tenantId`.
     - En `suscriptores-router.ts` y `suscripciones-router.ts`: inyección automática de `tenantId` en creaciones y validaciones de pertenencia de inquilino.
   - Rutas protegidas: las operaciones mutantes (`POST`, `PUT`, `DELETE`) requieren `authMiddleware + requireRole(['admin']) + tenantScopeMiddleware`. Las consultas `GET` admiten `optionalAuthMiddleware` para mantener compatibilidad hacia atrás en tests.

---

## 3. Cambios en Frontend (`frontend/`)

### Archivos Creados en Frontend

| Archivo | Propósito |
| :--- | :--- |
| `src/common/store/auth.store.ts` | Store de Pinia para autenticación. Gestiona estado (`user`, `accessToken`, `refreshToken`, `loading`, `error`), propiedades computadas (`isAuthenticated`, `isAdmin`, `isSubscriptor`, `tenantName`, `displayName`), y acciones de login, registro de admin, registro de subscriptor, refresco y logout con auto-hidratación desde `localStorage`. |
| `src/views/LoginView.vue` | Formulario de inicio de sesión con soporte para email o usuario, botones demo para admin y subscriptor, feedback mediante toasts y redirección inteligente por rol. |
| `src/views/RegisterView.vue` | Formulario de registro con pestañas separadas para Dueño de Bodega (Admin) y Cliente (Subscriptor), validaciones y feedback de error/éxito. |
| `src/views/CatalogoView.vue` | Vista de catálogo exclusiva para subscriptores. Presenta las cajas mensuales activas, precios, categorías y composiciones en tarjetas de diseño de lujo. |

### Archivos Modificados en Frontend

1. **`src/common/api/http-client.ts`**:
   - Reescrito con interceptores de solicitud (inyección de JWT) y respuesta (detección de error 401 y refresco transparente de tokens encolando peticiones concurrentes).
2. **`src/router/index.ts`**:
   - Registradas las rutas `/login`, `/register`, `/catalogo`.
   - Definidos metadatos de rutas (`requiresAuth`, `requiresGuest`, `roles`).
   - Implementado el guard global `router.beforeEach` para proteger vistas según rol y redirigir usuarios no autenticados o con roles incompatibles.
3. **`src/common/components/AppNavbar.vue`**:
   - Enlaces dinámicos según el rol (`Dashboard`, `Suscriptores`, `Suscripciones`, `Cajas Mensuales`, `Productos` para Admin; `Catálogo` para Subscriptor).
   - Visualización del nombre de usuario, insignia de rol (`Admin` / `Subscriptor`), nombre de la bodega (inquilino) y botón de cierre de sesión.
4. **`src/App.vue`**:
   - Hidratación de la sesión en el montaje inicial y renderizado condicional del Navbar (oculto en pantallas de login y registro).
5. **Corrección de llamada en `CatalogoView.vue`**:
   - Ajustada la invocación del método a `store.fetchCajas()` alineado con el store de Cajas Mensuales.

---

## 4. Credenciales de Demostración

| Perfil / Rol | Usuario | Contraseña | Inquilino / Bodega |
| :--- | :--- | :--- | :--- |
| **Admin de Bodega** | `admin` | `password123` | Bodega Raíces de Cuyo |
| **Cliente Subscriptor** | `valentina` | `password123` | N/A (Subscriptor) |

---

## 5. Pruebas y Verificación Realizadas

1. **Pruebas de Regresión de Backend:**
   - Comando: `node --test test/soft-delete.test.cjs`
   - Resultado: **12 de 12 pruebas pasadas (0 fallas)**.
2. **Compilación de Backend:**
   - Comando: `npm run build` en `Backend/`
   - Resultado: **0 errores de TypeScript**.
3. **Compilación de Frontend:**
   - Comando: `npm run build` en `frontend/`
   - Resultado: **Compilación exitosa (vue-tsc + vite build) sin errores**.
4. **Verificación de Servicios:**
   - Backend escuchando en `http://localhost:3000` (Healthcheck `/api/health` retorna status 200).
   - Frontend activo en `http://localhost:5173` listo para navegación.

