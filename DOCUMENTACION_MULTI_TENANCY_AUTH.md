# Documentación Técnica: Autenticación Multi-Tenancy y RBAC

**Proyecto:** ClubCurator SaaS (Monolito Modular - Express, TypeORM, Vue 3, Pinia)  
**Fecha:** 2026-11-09  
**Rama:** `feature/integracion-ramas`

---

## 1. Resumen Ejecutivo de la Implementación

Se ha diseñado, corregido e implementado una arquitectura integral de **autenticación multi-tenancy** con **control de acceso basado en roles (RBAC)**, **manejo de tokens JWT (Access & Refresh)** y **aislamiento estricto tanto en lecturas (GET) como en escrituras (POST, PUT, DELETE)** para la plataforma SaaS ClubCurator.

### Requisitos Cumplidos
1. **Lógica de perfiles con dos roles bien diferenciados:**
   - **`admin` (Dueño de Bodega / Inquilino):** Representa a los propietarios de bodegas, tostaderos de café o cervecerías artesanales. Dispone de permisos CRUD completos sobre el catálogo, clientes y suscripciones exclusivos de su inquilino.
   - **`subscriptor` (Cliente / Consumidor Final):** Miembro del club de suscripción. Tiene acceso de consulta al catálogo de cajas disponibles, puede suscribirse a nuevas cajas y gestionar sus membresías personales (pausar/cancelar), sin permisos de administración sobre otros clientes o bodegas.
2. **Requisitos de registro por rol:**
   - **Registro de Administrador:** Requiere `nombreNegocio`, `email`, `password`, `username`.
   - **Registro de Subscriptor:** Requiere `email`, `username`, `nombre`, `apellido`, `password`.
3. **Manejo de tokens JWT (Access y Refresh):**
   - Emisión y verificación de pares de tokens con claims de rol y `tenantId`.
   - Persistencia segura del refresh token en base de datos.
   - Interceptores automáticos en Axios (`http-client.ts`) para inyección de token Bearer y refresco transparente ante respuestas HTTP 401.
4. **Verdadero Aislamiento Multi-Tenant de Datos (Lecturas y Escrituras):**
   - **`suscriptores`:** Cada bodega gestiona su propia cartera de clientes. Cada cliente tiene `tenantId` asociado. Un admin no puede ver, listar, modificar ni dar de baja clientes de otros negocios.
   - **`productos` y `cajas_mensuales`:** Cuando un admin consulta `GET /api/productos` o `GET /api/cajas-mensuales`, la consulta se acota estrictamente a su `tenantId`. Cuando un cliente o visitante anónimo consulta, visualiza el catálogo general de cajas activas.
   - **`suscripciones`:** Un admin solo ve y gestiona suscripciones correspondientes a las cajas de su propio negocio. Un cliente final solo ve y gestiona sus propias suscripciones (vinculadas confiablemente a su `suscriptorId`).
5. **Navegación y Vistas diferenciadas en Frontend:**
   - Guards globales de navegación en Vue Router según estado de autenticación y rol.
   - `CatalogoView.vue`: Catálogo con visualización de cajas disponibles, botón directo "Suscribirme", control de duplicados ("✓ Ya Suscripto") y panel de "Mis Membresías Activas" con opciones para pausar o cancelar.
   - Navbar reactivo que adapta sus enlaces y muestra badges según el rol activo.
6. **Usuarios de Demostración Restaurados y Operativos:**
   - `admin` / `password123`: Bodega Raíces de Cuyo.
   - `valentina` / `password123`: Cliente Subscriptora vinculada a su ficha de suscriptor.

---

## 2. Detalles de Implementación en Backend (`Backend/`)

### Aislamiento en Repositorios y Rutas

| Módulo | Endpoint / Método | Comportamiento Multi-Tenant |
| :--- | :--- | :--- |
| **Suscriptores** | `GET /api/suscriptores` | Protegido con `optionalAuthMiddleware`. Si el usuario es `admin`, filtra estrictamente por `tenantId = req.user.tenantId`. |
| **Suscriptores** | `GET /api/suscriptores/:id` | Valida que el cliente pertenezca al `tenantId` del administrador autenticado; si pertenece a otra bodega devuelve 404. |
| **Suscriptores** | `POST /api/suscriptores` | Inyecta automáticamente el `tenantId` del admin logueado desde `req.tenantId`. |
| **Suscriptores** | `PUT /api/suscriptores/:id` | Verifica pertenencia mediante `assertTenantOwnership`. |
| **Suscriptores** | `DELETE /api/suscriptores/:id` | Verifica pertenencia mediante `assertTenantOwnership`. Previene que un admin elimine clientes de otra bodega. |
| **Productos** | `GET /api/productos` | Si el usuario es `admin`, filtra por `producto.tenantId = :tenantId`. Para clientes y anónimos devuelve catálogo disponible. |
| **Productos** | `GET /api/productos/:id` | Si el usuario es `admin`, restringe al producto de su bodega. |
| **Cajas Mensuales** | `GET /api/cajas-mensuales` | Si el usuario es `admin`, filtra por `caja.tenantId = :tenantId`. Para clientes y anónimos devuelve cajas del catálogo. |
| **Cajas Mensuales** | `GET /api/cajas-mensuales/:id` | Si el usuario es `admin`, restringe a la caja de su bodega. |
| **Suscripciones** | `GET /api/suscripciones` | Requiere autenticación. Si es `admin`, filtra por `suscripcion.tenantId = req.user.tenantId`. Si es `subscriptor`, filtra por `suscripcion.suscriptorId`. |
| **Suscripciones** | `POST /api/suscripciones` | Si es `subscriptor`, asocia la suscripción a su `suscriptorId` y hereda el `tenantId` de la caja seleccionada. Previene suscripciones duplicadas activas (HTTP 409). |
| **Suscripciones** | `PUT /api/suscripciones/:id/pausar` y `cancelar` | Permitido tanto para el admin del negocio como para el cliente dueño de la membresía. |

---

## 3. Credenciales de Demostración

| Perfil / Rol | Usuario | Contraseña | Inquilino / Bodega | Identificador / Vínculo |
| :--- | :--- | :--- | :--- | :--- |
| **Admin de Bodega** | `admin` | `password123` | Bodega Raíces de Cuyo | `tenant-bodega-raices-001` |
| **Cliente Subscriptor** | `valentina` | `password123` | N/A (Cliente) | Suscriptor `8de1678f-e9ed-4027-aa20-55948956a8ea` |

---

## 4. Pruebas y Verificación

1. **Suite de Pruebas Automatizadas (`npm test`):**
   - `vitest run`: **14 de 14 pruebas pasadas**.
   - `npm run test:queue`: **60 de 60 pruebas pasadas**.
   - Total: **74 de 74 pruebas superadas**.
2. **Pruebas de Regresión de Base de Datos y Soft Delete:**
   - Comando: `node --test test/soft-delete.test.cjs`
   - Resultado: **11 de 11 pruebas superadas**.
3. **Prueba Integral de Aislamiento Multi-Tenancy:**
   - Script de verificación ejecutado con éxito cubriendo:
     - Un admin de un nuevo negocio no ve productos, cajas, clientes ni suscripciones de otros negocios.
     - Un admin no puede consultar ni eliminar clientes creados por otra bodega (HTTP 404).
     - La clienta `valentina` visualiza las cajas del catálogo, se suscribe con éxito y visualiza su membresía en "Mis Membresías Activas".
     - La suscripción creada impacta inmediatamente en el dashboard del admin dueño de la caja y permanece oculta para otros administradores.
     - Se valida la política de prevención de duplicados (HTTP 409) y las acciones de pausar y cancelar.
4. **Compilación de Frontend:**
   - `npm run build` en `frontend/` ejecutado sin errores (`vue-tsc && vite build`).
5. **Compilación de Backend:**
   - `npm run build` en `Backend/` ejecutado sin errores (`tsc`).
