# Contratos de servicios — REST y SOAP

Este documento resume los contratos públicos de la plataforma LeyLine / ClubCurator.

- **REST**: OpenAPI 3.0.3, disponible en `Backend/src/config/openapi.ts` y exportado a [`docs/openapi.json`](openapi.json).
- **SOAP**: contrato WSDL en [`docs/soap/inventario.wsdl`](soap/inventario.wsdl), servido por la propia aplicación.

---

## 1. API REST

### 1.1 URLs

| Recurso | URL |
|---|---|
| Base local | `http://localhost:3000` |
| Swagger UI | `http://localhost:3000/api/docs` |
| Documento OpenAPI | `http://localhost:3000/api/docs.json` |
| Healthcheck | `http://localhost:3000/api/health` |

Para regenerar el archivo exportado:

```bash
cd Backend
npm run openapi:export
```

### 1.2 Endpoints

| Método | Ruta | Descripción | Éxito | Errores esperables |
|---|---|---|---|---|
| GET | `/api/health` | Estado del servicio y de la conexión | 200 | — |
| GET | `/api/suscriptores` | Listar suscriptores | 200 | — |
| POST | `/api/suscriptores` | Crear suscriptor | 201 | 400, 409 (email duplicado) |
| GET | `/api/suscriptores/{id}` | Obtener suscriptor | 200 | 400, 404 |
| PUT | `/api/suscriptores/{id}` | Actualizar suscriptor | 200 | 400, 404 |
| DELETE | `/api/suscriptores/{id}` | Eliminar suscriptor | 200 | 404 |
| GET | `/api/suscripciones` | Listar suscripciones | 200 | — |
| POST | `/api/suscripciones` | Crear suscripción (valida stock por SOAP) | 201 | 400, 404, 409, 503 |
| GET | `/api/suscripciones/{id}` | Obtener suscripción | 200 | 400, 404 |
| PUT | `/api/suscripciones/{id}` | Actualizar suscripción | 200 | 400, 404 |
| DELETE | `/api/suscripciones/{id}` | Eliminar suscripción | 200 | 404 |
| PUT/PATCH | `/api/suscripciones/{id}/pausar` | Pausar suscripción activa | 200 | 400, 404 |
| PUT/PATCH | `/api/suscripciones/{id}/cancelar` | Cancelar suscripción | 200 | 400, 404 |
| GET | `/api/suscripciones/cliente/{suscriptorId}` | Suscripciones de un cliente | 200 | 400 |
| GET | `/api/suscripciones/suscriptor/{suscriptorId}` | Alias del anterior | 200 | 400 |
| GET | `/api/cajas-mensuales` | Listar cajas | 200 | — |
| POST | `/api/cajas-mensuales` | Crear caja con composiciones | 201 | 400, 404 |
| GET | `/api/cajas-mensuales/{id}` | Obtener caja | 200 | 400, 404 |
| PUT | `/api/cajas-mensuales/{id}` | Actualizar caja | 200 | 400, 404 |
| DELETE | `/api/cajas-mensuales/{id}` | Eliminar caja | 200 | 404, 409 (tiene suscripciones) |
| GET | `/api/cajas-mensuales/periodo/{anio}/{mes}` | Cajas de un período | 200 | 400 |
| POST | `/api/cajas-mensuales/recomendar` | Generar recomendación | 200 | 400 |
| GET | `/api/productos` | Listar productos | 200 | — |
| POST | `/api/productos` | Crear producto | 201 | 400, 409 (SKU duplicado) |
| GET | `/api/productos/{id}` | Obtener producto | 200 | 400, 404 |
| PUT | `/api/productos/{id}` | Actualizar producto | 200 | 400, 404 |
| DELETE | `/api/productos/{id}` | Eliminar producto | 200 | 404, 409 (relacionado) |

### 1.3 Formato de respuesta

Éxito:

```json
{
  "status": "success",
  "data": { }
}
```

Error:

```json
{
  "status": "error",
  "message": "Descripción legible del error"
}
```

Todas las respuestas incluyen el header `X-Request-Id` para trazabilidad.

### 1.4 Códigos de error

| Código | Significado |
|---|---|
| 400 | Datos inválidos, UUID mal formado, estado no permitido |
| 404 | Recurso inexistente |
| 409 | Conflicto: email/SKU duplicado, FK con `RESTRICT`, stock insuficiente |
| 503 | Servicio SOAP de inventario no disponible |
| 500 | Error interno no controlado |

### 1.5 Ejemplos con `curl`

Crear un producto:

```bash
curl -X POST http://localhost:3000/api/productos \
  -H 'Content-Type: application/json' \
  -d '{
    "nombre": "Malbec Reserva",
    "categoria": "vinos",
    "tipo": "Tinto Reserva",
    "productor": "Bodega Demo",
    "precioReferencia": 4800
  }'
```

Crear una suscripción (dispara la validación de stock por SOAP):

```bash
curl -X POST http://localhost:3000/api/suscripciones \
  -H 'Content-Type: application/json' \
  -d '{
    "suscriptorId": "<uuid-suscriptor>",
    "cajaMensualId": "<uuid-caja>",
    "montoMensual": 14500
  }'
```

---

## 2. Servicio SOAP de inventario

### 2.1 URLs

| Recurso | URL |
|---|---|
| Endpoint SOAP | `http://localhost:3000/soap/inventario` |
| WSDL | `http://localhost:3000/soap/inventario?wsdl` |
| WSDL versionado | [`docs/soap/inventario.wsdl`](soap/inventario.wsdl) |

### 2.2 Operaciones

| Operación | Entrada | Salida | Descripción |
|---|---|---|---|
| `consultarInventario` | `productoId` | `inventario` | Devuelve stock disponible, reservado y productor |
| `reservarStock` | `productoId`, `cantidad` | `reserva` | Descuenta stock disponible y lo suma a reservado |
| `actualizarInventario` | `productoId`, `cantidadDisponible` | `inventario` | Fija el stock disponible informado por el productor |

El stock se modela en la tabla `stock_productos`, con una fila por producto:

- `productoId` (UUID, único, FK a `productos`)
- `productor`
- `cantidadDisponible`
- `cantidadReservada`
- `actualizadoEn`

### 2.3 Ejemplo de consulta

```bash
curl -X POST http://localhost:3000/soap/inventario \
  -H 'Content-Type: text/xml; charset=utf-8' \
  -H 'SOAPAction: consultarInventario' \
  --data-binary @- <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope
  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:inv="http://leyline.com/soap/inventario">
  <soap:Body>
    <inv:consultarInventario>
      <inv:productoId>UUID_DEL_PRODUCTO</inv:productoId>
    </inv:consultarInventario>
  </soap:Body>
</soap:Envelope>
XML
```

Respuesta:

```xml
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <consultarInventarioResponse xmlns="http://leyline.com/soap/inventario">
      <inventario>
        <productoId>UUID_DEL_PRODUCTO</productoId>
        <productor>Bodega Demo</productor>
        <cantidadDisponible>55</cantidadDisponible>
        <cantidadReservada>2</cantidadReservada>
        <actualizadoEn>2026-11-05T18:00:00.000Z</actualizadoEn>
      </inventario>
    </consultarInventarioResponse>
  </soap:Body>
</soap:Envelope>
```

### 2.4 Ejemplo de reserva

```xml
<soap:Envelope
  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:inv="http://leyline.com/soap/inventario">
  <soap:Body>
    <inv:reservarStock>
      <inv:productoId>UUID_DEL_PRODUCTO</inv:productoId>
      <inv:cantidad>2</inv:cantidad>
    </inv:reservarStock>
  </soap:Body>
</soap:Envelope>
```

La respuesta incluye `exito`, `cantidadSolicitada`, `cantidadDisponible`, `cantidadReservada` y `mensaje`. Si no hay stock suficiente, `exito` es `false` y el stock no se modifica.

### 2.5 Cliente interno

El alta de suscripciones usa `InventarioSoapClient` (`Backend/src/modules/inventario/client/inventario-soap-client.ts`):

1. Recorre las composiciones de la caja.
2. Consulta el inventario de cada producto por SOAP.
3. Si algún producto no alcanza la cantidad requerida, responde `409 Conflict`.
4. Si el servicio no responde dentro de `SOAP_TIMEOUT_MS`, responde `503 Service Unavailable`.

Variables de entorno:

```env
SOAP_INVENTARIO_ENABLED=true
SOAP_INVENTARIO_URL=http://localhost:3000/soap/inventario
SOAP_TIMEOUT_MS=5000
```

Para desactivar la validación en pruebas o desarrollos sin SOAP:

```env
SOAP_INVENTARIO_ENABLED=false
```
