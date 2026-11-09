---
name: saas-multitenancy-auth
description: "Implementación de arquitectura multi-tenancy, autenticación JWT (Access & Refresh Tokens), control de acceso basado en roles (Admin de Bodega vs Subscriptor) y aislamiento de datos para el SaaS ClubCurator."
---

# Multi-Tenancy Authentication & RBAC Skill (ClubCurator SaaS)

Esta skill documenta la arquitectura, patrones y estándares implementados para la autenticación multi-tenancy, el flujo de tokens (Access y Refresh), el control de acceso basado en roles (RBAC) y el aislamiento de datos por inquilino en la plataforma **ClubCurator**.

---

## 1. Modelo de Negocio y Lógica de Perfiles

ClubCurator opera bajo un modelo de arquitectura SaaS multi-tenant con dos perfiles de usuario claramente diferenciados:

| Perfil / Rol | Descripción | Datos Requeridos en Registro | Permisos y Alcance |
| :--- | :--- | :--- | :--- |
| **`admin`** (Dueño de Bodega / Inquilino) | Administrador de una bodega, tostadero o comercio artesanal específico. Cada admin representa un inquilino (*tenant*). | - `nombreNegocio`<br>- `email`<br>- `password`<br>- `username` | CRUD total sobre los datos de su propio *tenant*: productos, cajas mensuales, suscripciones y visualización de suscriptores asociados. No puede acceder a datos de otras bodegas. |
| **`subscriptor`** (Cliente Final) | Cliente o socio del club de suscripción. | - `email`<br>- `username`<br>- `nombre`<br>- `apellido`<br>- `password` | Solo lectura del catálogo de cajas disponibles, gestión de sus propias preferencias organolépticas y administración de su membresía. No tiene acceso al panel de administración ni a operaciones de creación/edición/borrado. |

---

## 2. Flujo de Tokens JWT (Access & Refresh)

### Duración y Propósito
- **Access Token**: Vida corta (15 minutos por defecto, configurable mediante `JWT_EXPIRES_IN`). Se incluye en el header HTTP `Authorization: Bearer <token>`.
- **Refresh Token**: Vida larga (7 días por defecto, configurable mediante `JWT_REFRESH_EXPIRES_IN`). Se almacena hasheado en la base de datos (`users.refreshToken`) y permite renovar el par de tokens sin requerir que el usuario vuelva a ingresar credenciales.

### Rotación de Refresh Tokens
Al consumir el endpoint `POST /api/auth/refresh`, el backend valida la firma del refresh token, verifica la coincidencia con el token persistido en la base de datos para ese usuario, y emite un nuevo par (nuevo access token y nuevo refresh token), invalidando el anterior.

### Manejo Automático en Frontend (Axios Interceptors)
El archivo `frontend/src/common/api/http-client.ts` implementa:
1. **Request Interceptor**: Agrega automáticamente `Authorization: Bearer <access_token>` a cada petición saliente si existe en `localStorage`.
2. **Response Interceptor (Manejo de 401)**:
   - Detecta respuestas con código 401.
   - Encola peticiones concurrentes para evitar múltiples llamadas de refresco en paralelo.
   - Envía el `refreshToken` a `/api/auth/refresh`.
   - Actualiza los tokens en `localStorage` y en `auth.store.ts`.
   - Reintenta las peticiones pendientes con el nuevo token.
   - Si el refresh token también expiró o es inválido, redirige al usuario a `/login` limpiando la sesión.

---

## 3. Endpoints del Módulo de Autenticación (`/api/auth`)

| Método | Endpoint | Acceso | Body Requerido | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register-admin` | Público | `{ nombreNegocio, email, password, username }` | Crea el `Tenant`, calcula su `slug`, y crea el `User` con rol `admin` vinculado al inquilino. Retorna `{ user, accessToken, refreshToken }`. |
| `POST` | `/api/auth/register-subscriptor` | Público | `{ email, username, nombre, apellido, password }` | Crea el `User` con rol `subscriptor` y sincroniza el registro en la tabla `suscriptores`. Retorna `{ user, accessToken, refreshToken }`. |
| `POST` | `/api/auth/login` | Público | `{ identifier, password }` | Permite ingresar con `username` o `email`. Retorna `{ user, accessToken, refreshToken }`. |
| `POST` | `/api/auth/refresh` | Público | `{ refreshToken }` | Emite un nuevo par de tokens validando el refresh token previo. |
| `POST` | `/api/auth/logout` | Autenticado | Ninguno (usa token Bearer) | Invalida el refresh token en la base de datos. |
| `GET` | `/api/auth/me` | Autenticado | Ninguno (usa token Bearer) | Retorna los datos del usuario actual y su información de inquilino. |

---

## 4. Esquema de Base de Datos y Aislamiento Multi-Tenant

### Nuevas Tablas (`AddAuthAndMultiTenancy`)

```sql
-- Tabla de Inquilinos (Tenants)
CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(36) PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  plan VARCHAR(50) DEFAULT 'basic',
  activo BOOLEAN DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuarios con roles y multitenancy
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL, -- 'admin' | 'subscriptor'
  nombre VARCHAR(100),
  apellido VARCHAR(100),
  refreshToken TEXT,
  tenantId VARCHAR(36),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE SET NULL
);
```

### Relación con Entidades de Negocio
Las tablas `productos`, `cajas_mensuales` y `suscripciones` cuentan con la columna `tenantId`:
- En consultas de lectura para administradores (`GET /api/productos`, etc.): Si el usuario está autenticado como `admin`, los repositorios filtran automáticamente `WHERE tenantId = :tenantId`.
- En creaciones (`POST`): El middleware `tenantScopeMiddleware` inyecta automáticamente `req.body.tenantId = req.user.tenantId`, impidiendo la suplantación de inquilino desde el cliente.

---

## 5. Middlewares de Seguridad del Backend

1. **`authMiddleware`** (`Backend/src/common/middlewares/auth.middleware.ts`):
   - Extrae el token Bearer del header `Authorization`.
   - Verifica la firma y expiración con `JwtUtils.verifyAccessToken`.
   - Inyecta `req.user = { userId, email, role, tenantId }`.

2. **`requireRole(roles)`** (`Backend/src/common/middlewares/roles.middleware.ts`):
   - Valida que `req.user.role` pertenezca al listado permitido (ej. `['admin']`).
   - Responde con HTTP 403 Forbidden si el rol no tiene privilegios.

3. **`tenantScopeMiddleware`** (`Backend/src/common/middlewares/tenant.middleware.ts`):
   - Para usuarios administradores, asegura que el inquilino exista y vincula `req.body.tenantId` y `req.tenantId`.

---

## 6. Frontend: Vistas y Navegación Condicional

### Rutas Protegidas en Vue Router (`frontend/src/router/index.ts`)
```ts
// Ejemplo de configuración con guards de rol
{
  path: '/',
  name: 'Dashboard',
  component: DashboardView,
  meta: { requiresAuth: true, roles: ['admin'] }
},
{
  path: '/catalogo',
  name: 'Catalogo',
  component: CatalogoView,
  meta: { requiresAuth: true, roles: ['subscriptor'] }
},
{
  path: '/login',
  name: 'Login',
  component: LoginView,
  meta: { requiresGuest: true }
}
```

### Guard Global (`router.beforeEach`)
- Si un usuario no autenticado intenta ingresar a una ruta protegida (`requiresAuth`), es redirigido a `/login?redirect=<ruta>`.
- Si un usuario autenticado intenta acceder a `/login` o `/register` (`requiresGuest`), es redirigido a `/` (si es `admin`) o a `/catalogo` (si es `subscriptor`).
- Si un usuario con rol `subscriptor` intenta acceder a rutas de administración, es redirigido a `/catalogo`.
- `authStore.initAuth()` se ejecuta automáticamente de forma síncrona al inicializar el store para garantizar que la sesión persista tras recargar la página (F5).

### Vistas Creadas
- **`LoginView.vue`**: Formulario de ingreso con soporte para correo o nombre de usuario, con botones rápidos de demo para Admin y Subscriptor.
- **`RegisterView.vue`**: Pestañas interactivas para registro diferenciado:
  - Pestaña **Admin**: Negocio, Usuario, Correo, Contraseña.
  - Pestaña **Subscriptor**: Nombre, Apellido, Usuario, Correo, Contraseña.
- **`CatalogoView.vue`**: Vista exclusiva para subscriptores donde pueden explorar las cajas mensuales activas, sus composiciones y precios en modo lectura.
- **`AppNavbar.vue`**: Barra de navegación reactiva que muestra únicamente las opciones permitidas según el rol del usuario autenticado, su nombre, el distintivo de rol y el botón para cerrar sesión.

---

## 7. Credenciales de Demostración

| Usuario | Contraseña | Rol | Negocio / Alcance |
| :--- | :--- | :--- | :--- |
| `admin` | `password123` | `admin` | Bodega Raíces de Cuyo (Tenant por defecto) |
| `valentina` | `password123` | `subscriptor` | Cliente / Subscriptor final |

