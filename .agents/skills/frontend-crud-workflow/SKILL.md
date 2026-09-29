---
name: frontend-crud-workflow
description: Workflow and specifications for Vue 3 frontend development with ClubCurator luxury design system and full CRUD integration for all backend modules (Suscriptores, Suscripciones, Cajas Mensuales, Productos).
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
- **Aesthetic**: Minimalist luxury, high contrast, clean modal dialogs and data tables/cards.

---

## 2. Backend Modules & Endpoints Overview

| Module | Base URL | Endpoints | Key Fields |
| :--- | :--- | :--- | :--- |
| **Suscriptores** | `/api/suscriptores` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | `nombre`, `apellido`, `email`, `telefono`, `documento`, `direccion`, `preferenciasOrganolepticas`, `activo` |
| **Suscripciones** | `/api/suscripciones` | `GET /`, `GET /:id`, `GET /suscriptor/:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/pausar`, `PATCH /:id/cancelar` | `suscriptorId`, `cajaMensualId`, `categoria`, `estado` ('activa'\|'pausada'\|'cancelada'), `montoMensual`, `fechaInicio`, `proximoCobro` |
| **Cajas Mensuales** | `/api/cajas-mensuales` | `GET /`, `GET /:id`, `GET /periodo/:anio/:mes`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /recomendar` | `nombre`, `categoria` ('vinos'\|'cafes'\|'cervezas'), `mes`, `anio`, `descripcion`, `precioBase`, `disponible`, `composiciones` |
| **Productos** | `/api/productos` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | `nombre`, `descripcion`, `categoria`, `tipo`, `productor`, `perfilNotas`, `alergenosRestricciones`, `sku`, `precioReferencia`, `activo` |

---

## 3. CRUD Standard Implementation Architecture

Each module follows the standard directory structure:
```
frontend/src/modules/<module-name>/
├── services/
│   └── <module>.service.ts    # Axios HTTP methods
├── store/
│   └── <module>.store.ts      # Pinia state management
├── components/                # Modals (Create/Edit), Confirmation Dialogs
│   ├── <Module>Modal.vue
│   └── <Module>Card.vue / Table
└── views/
    └── <Module>View.vue       # Main listing view with Add/Edit/Delete triggers
```
