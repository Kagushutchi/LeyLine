---
name: frontend-crud-workflow
description: Workflow and specifications for Vue 3 frontend development with ClubCurator luxury design system, full CRUD integration, toast notification feedback, and TypeORM backend troubleshooting.
---

# SaaS Front-End UI & API Integration Specialist Skill

## 1. Visual & Style System Guidelines

### Strict Luxury Palette:
- **Primary / Dark Backgrounds & Text**: `#020201` (Rich Dark / Deep Black)
- **Secondary Accent / Muted Elements**: `#6f859b` (Slate Grey-Blue)
- **Borders, Dividers & Subtle Surfaces**: `#c2c5cb` (Cool Grey)
- **Light Backgrounds & Clean Canvas**: `#f2e8e2` (Soft Cream / Warm White)

### Typography:
- **Headings & Brand Display**: `Playfair Display` (Serif)
- **Body & Controls**: Clean Sans-Serif (`Inter` or System Sans-Serif)

### Execution Rules:
- **No Gradients**: Strictly solid colors, sharp borders, clean contrast.
- **Micro-Animations**: Transitions 150ms - 200ms `ease-in-out` / `ease-out`.
- **Aesthetic**: Minimalist luxury, high contrast, clean modal dialogs, data tables, and floating toast notifications.

---

## 2. Notification Feedback System (Toasts)

Every CRUD operation MUST trigger an immediate, non-intrusive toast feedback:
- **Creación**: `"X creado con éxito"` (ej: `"Producto creado con éxito"`, `"Suscriptor registrado con éxito"`).
- **Modificación**: `"X modificado con éxito"` (ej: `"Suscripción modificada con éxito"`).
- **Eliminación**: `"X eliminado con éxito"` (ej: `"Caja mensual eliminada con éxito"`).
- **Acciones especiales**: `"Suscripción pausada con éxito"`, `"Suscripción cancelada con éxito"`.
- **Manejo de Errores**: Captura de excepciones con mensaje de error del backend en toast de alerta rojo.

Implemented via `useToastStore()` in `frontend/src/common/store/toast.store.ts` and rendered globally in `ToastNotification.vue`.

---

## 3. Backend Integration & Troubleshooting Checklist

1. **TypeORM `Repository.delete` vs `Repository.remove`**:
   - In `BaseTypeORM` (`Backend/src/common/classes/base-typeorm-repository.ts`), NEVER pass entity objects with relations (`OneToMany`, `ManyToOne`) to `this.repository.delete(el)`.
   - ALWAYS use `await this.repository.remove(el)` to avoid the error `Cannot query across one-to-many for property composiciones`.
2. **Express Router Path Concatenation**:
   - Avoid double slashes in router definitions. Use literal paths `router.get('/')` and `router.get('/:id')`.
   - Double slashes like `router.get('//:id')` result in `404 Not Found` for requests to `/api/<module>/:id`.
3. **Entity Updates**:
   - In TypeORM `update()`, fetch the entity using `findOneById`, merge properties with `Object.assign(entity, payload)` or `repository.merge`, and call `repository.save(entity)` to ensure JSON columns and lifecycle hooks run cleanly.

---

## 4. Backend Modules & Endpoints Overview

| Module | Base URL | Endpoints | Key Fields |
| :--- | :--- | :--- | :--- |
| **Suscriptores** | `/api/suscriptores` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | `nombre`, `apellido`, `email`, `telefono`, `documento`, `direccion`, `preferenciasOrganolepticas`, `activo` |
| **Suscripciones** | `/api/suscripciones` | `GET /`, `GET /:id`, `GET /suscriptor/:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/pausar`, `PATCH /:id/cancelar` | `suscriptorId`, `cajaMensualId`, `categoria`, `estado` ('activa'\|'pausada'\|'cancelada'), `montoMensual`, `fechaInicio`, `proximoCobro` |
| **Cajas Mensuales** | `/api/cajas-mensuales` | `GET /`, `GET /:id`, `GET /periodo/:anio/:mes`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /recomendar` | `nombre`, `categoria` ('vinos'\|'cafes'\|'cervezas'), `mes`, `anio`, `descripcion`, `precioBase`, `disponible`, `composiciones` |
| **Productos** | `/api/productos` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | `nombre`, `descripcion`, `categoria`, `tipo`, `productor`, `perfilNotas`, `alergenosRestricciones`, `sku`, `precioReferencia`, `activo` |

---

## 5. Step-by-Step Guide for Next Agents

1. **Verify Backend Build**: Run `cmd /c npm run build` in `Backend` directory if needed.
2. **Verify Frontend Build**: Run `cmd /c npm run build` in `frontend` directory.
3. **Module Extension Pattern**:
   - Service in `src/modules/<name>/services/<name>.service.ts`
   - Store in `src/modules/<name>/store/<name>.store.ts`
   - Form Modal in `src/modules/<name>/components/<Name>Modal.vue`
   - View Table/Cards in `src/modules/<name>/views/<Name>View.vue` with `useToastStore()` calls.
