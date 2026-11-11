# Documentación Técnica: Componentes de IA — ClubCurator Sommelier & Asesor Comercial

**Proyecto:** ClubCurator SaaS (LeyLine)  
**Materia:** 3.4.218 Desarrollo de Aplicaciones II — UADE  
**Entrega:** Trabajo Práctico Segunda Parte / Integrador  
**Fecha:** Noviembre 2026  

---

## 1. Resumen Ejecutivo y Cumplimiento de Consigna (TP.md)

En cumplimiento de la consigna obligatoria del **Trabajo Práctico Segunda Parte (sección Componente de IA)**:

> *"Integrar al menos uno de los siguientes componentes de Inteligencia Artificial:*  
> *- Servicio de recomendaciones de productos (basado en historial o contenido) consumiendo una API de ML o un modelo simple.*  
> *El componente de IA debe exponerse como un servicio REST o ser invocado de forma asincrónica a través de la cola de mensajes.*  
> *Entregable: ... componente de IA funcional + evidencias de prueba."*

El sistema integra **dos capacidades complementarias de Inteligencia Artificial** utilizando la API de **Google Gemini (Google AI Studio)**:

1. **Sommelier Virtual para Clientes (`POST /api/cajas-mensuales/recomendar`):**  
   Recomendador basado en contenido que analiza las preferencias organolépticas individuales del suscriptor (`preferenciasOrganolepticas`) y el catálogo de cajas y productos activos, devolviendo la mejor opción con porcentaje de afinidad y veredicto sommelier en lenguaje natural.
2. **Asesor Estratégico para Administradores (`POST /api/cajas-mensuales/sugerir-caja-admin`):**  
   Inteligencia de mercado para el dueño de la bodega/tostadero. Analiza de forma agregada las notas de cata más demandadas por toda su masa de suscriptores y cruza esos datos con el inventario de productos de su negocio para proponer qué nueva caja mensual crear, con qué productos, a qué precio sugerido y con qué justificación comercial.

---

## 2. Arquitectura de los Componentes de IA

### 2.1 Flujo 1: Recomendación para el Cliente (Subscriptor)

```
   ┌──────────────────────────────────────────────────────────────┐
   │                     CLIENTE / FRONTEND                       │
   │      Vista: /catalogo (Banner "Descubrir mi caja ideal")     │
   └──────────────────────────────┬───────────────────────────────┘
                                  │ POST /api/cajas-mensuales/recomendar
                                  │ Body: { suscriptorId }
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                  CajasMensualesController                    │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │            Caso de Uso: RecommendCajaMensual                 │
   │  - Obtiene perfil del suscriptor (notas, intensidad, alergia)│
   │  - Obtiene cajas activas del catálogo con sus composiciones │
   │  - Prompt sommelier a Gemini 2.0 Flash                       │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                Respuesta al Cliente en UI                    │
   │  - Caja sugerida (con composiciones y precio)                │
   │  - Badge: "95% de coincidencia con tu perfil"                │
   │  - Veredicto sommelier personalizado                         │
   │  - Botón: "Suscribirme a la caja recomendada"                │
   └──────────────────────────────────────────────────────────────┘
```

### 2.2 Flujo 2: Asesor Estratégico para el Administrador (Bodega)

```
   ┌──────────────────────────────────────────────────────────────┐
   │                      ADMIN / FRONTEND                        │
   │       Vista: /cajas-mensuales (Botón "✨ Sugerir Caja IA")    │
   └──────────────────────────────┬───────────────────────────────┘
                                  │ POST /api/cajas-mensuales/sugerir-caja-admin
                                  │ Headers: Authorization (Admin JWT)
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                  CajasMensualesController                    │
   │             (Filtra por tenantId del Administrador)          │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │             Caso de Uso: SuggestCajaAdmin                    │
   │  - Agrega notas de cata de todos los clientes del tenant     │
   │  - Mapea inventario real de productos del tenant             │
   │  - Prompt consultor comercial a Gemini 2.0 Flash             │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                Panel de Oportunidad Comercial                │
   │  - Nombre temático sugerido y precio propuesto               │
   │  - Porcentaje de afinidad estimado de la audiencia           │
   │  - Composición sugerida de botellas/productos reales         │
   │  - Justificación de demanda comercial                         │
   │  - Botón: "Crear Caja con esta Sugerencia" (pre-llena modal) │
   └──────────────────────────────────────────────────────────────┘
```

---

## 3. Configuración y Obtención de Credenciales

La clave **nunca se expone en código fuente ni se commitea a Git**.

### Paso 1: Obtener la API Key de Google AI Studio (Gratuita)
1. Ingresar en [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Hacer clic en **"Create API Key"**.
3. Copiar la clave generada (comienza con `AIzaSy...`).

### Paso 2: Configurar en el archivo `.env` del Backend
En `Backend/.env` agregar:

```env
GOOGLE_AI_API_KEY=AIzaSyTuClaveRealDeGoogleAIStudioAqui
GEMINI_MODEL=gemini-2.0-flash-exp
```

*(El archivo `Backend/.env.example` ya contiene la plantilla documentada).*

> **Manejo de Errores Silenciosos:** Si la clave no está configurada, ambos endpoints devuelven un código HTTP `503 Service Unavailable` explicando claramente que se requiere la clave `GOOGLE_AI_API_KEY`.

---

## 4. Endpoints REST y Especificación

### 4.1 Recomendación para Clientes
- **Método:** `POST`
- **Ruta:** `/api/cajas-mensuales/recomendar`
- **Body:**
```json
{
  "suscriptorId": "8de1678f-e9ed-4027-aa20-55948956a8ea"
}
```
- **Respuesta:**
```json
{
  "status": "success",
  "data": {
    "cajaRecomendada": {
      "id": "e4f8d120-745a-4cb1-9a13-81b491fa3200",
      "nombre": "Caja Tinto Reserva Especial",
      "precioBase": "28500.00",
      "composiciones": [...]
    },
    "puntajeMatchPorcentaje": 95,
    "explicacion": "Esta caja es ideal para Valentina porque contiene notas a frutos rojos y crianza en roble francés...",
    "modeloIA": "gemini-2.0-flash-exp"
  }
}
```

### 4.2 Asesor de Cajas para Administradores
- **Método:** `POST`
- **Ruta:** `/api/cajas-mensuales/sugerir-caja-admin`
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Respuesta:**
```json
{
  "status": "success",
  "data": {
    "nombreSugerido": "Colección Terroir & Crianza Cuyo",
    "categoria": "vinos",
    "precioSugerido": 29500,
    "descripcion": "Selección exclusiva con paso por barrica de roble francés y cuerpo intenso...",
    "justificacionComercial": "El 85% de tus suscriptores activos tienen preferencia por tintos de alta intensidad con notas a roble y frutos maduros. Esta caja utiliza tu stock de Gran Reserva Malbec maximizando la afinidad de recompra.",
    "porcentajeAudienciaAfin": 88,
    "modeloIA": "gemini-2.0-flash-exp",
    "composicionSugerida": [
      {
        "productoId": "84898150-c48f-4cf6-ba9c-309d59218206",
        "nombreProducto": "Gran Reserva Malbec 2020",
        "cantidad": 2
      }
    ]
  }
}
```

---

## 5. Implementación en el Frontend

1. **Cliente (`CatalogoView.vue`):**
   - Banner de Sommelier IA integrado.
   - Botón *"✨ Descubrir mi caja ideal"*.
   - Muestra la caja sugerida, porcentaje de coincidencia y veredicto sommelier.
   - Botón directo de suscripción.

2. **Administrador (`CajasMensualesView.vue`):**
   - Botón *"✨ Sugerir Caja con IA"* en la barra superior.
   - Panel interactivo con análisis de demanda de la masa de clientes.
   - Botón *"✨ Crear Caja con esta Sugerencia"*: Abre automáticamente el modal de creación con todos los campos pre-llenados listos para confirmar.

---

## 6. Evidencias de Pruebas Automatizadas

Se implementaron pruebas automáticas en `Backend/tests/recomendador-ia.test.ts`.

```bash
cd Backend
npx vitest run tests/recomendador-ia.test.ts
```

**Resultado:**
```text
✓ tests/recomendador-ia.test.ts (3 tests) 1455ms
  ✓ Componente de IA: Recomendador de Cajas Mensuales (Google Gemini API)
    ✓ rechaza con 400 si falta el suscriptorId en el body
    ✓ devuelve 503 informativo si la API Key de Google Gemini no está configurada
    ✓ procesa y devuelve la recomendación de IA con mock de Google Gemini

Test Files  1 passed (1)
Tests       3 passed (3)
Total Backend: 106 tests passed (100% de la suite)
```
