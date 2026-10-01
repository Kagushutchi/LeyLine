# Diagrama de Clases del Backend

Este diagrama combina el modelo de entidades definido en `diagrama-entidad-relacion.dbml` con las operaciones que hoy exponen los controllers del backend.

## Modelo de dominio

```mermaid
classDiagram
    direction LR

    class Suscriptor {
        +string id
        +string nombre
        +string apellido
        +string email
        +string telefono
        +string documento
        +DireccionSuscriptor direccion
        +PreferenciasOrganolepticas preferenciasOrganolepticas
        +boolean activo
        +Date createdAt
        +Date updatedAt
    }

    class Suscripcion {
        +string id
        +string suscriptorId
        +string cajaMensualId
        +CategoriaClub categoria
        +EstadoSuscripcion estado
        +number montoMensual
        +Date fechaInicio
        +Date proximoCobro
        +Date createdAt
        +Date updatedAt
    }

    class CajaMensual {
        +string id
        +string nombre
        +CategoriaClub categoria
        +number mes
        +number anio
        +string descripcion
        +number precioBase
        +boolean disponible
        +CajaMensualProducto[] composiciones
        +Date createdAt
        +Date updatedAt
    }

    class CajaMensualProducto {
        +string id
        +string cajaMensualId
        +string productoId
        +number cantidad
        +number orden
        +number precioAplicado
    }

    class Producto {
        +string id
        +string nombre
        +string descripcion
        +string categoria
        +string tipo
        +string productor
        +string[] perfilNotas
        +string[] alergenosRestricciones
        +string sku
        +number precioReferencia
        +boolean activo
        +Date createdAt
        +Date updatedAt
    }

    class DireccionSuscriptor {
        <<interface>>
        +string calle
        +string numero
        +string piso
        +string departamento
        +string ciudad
        +string provincia
        +string codigoPostal
        +string pais
    }

    class PreferenciasOrganolepticas {
        <<interface>>
        +CategoriaClub categoria
        +string[] perfilSabor
        +string intensidad
        +string[] alergiasRestricciones
        +string notasAdicionales
    }

    class CategoriaClub {
        <<enumeration>>
        vinos
        cafes
        cervezas
    }

    class EstadoSuscripcion {
        <<enumeration>>
        activa
        pausada
        cancelada
    }

    Suscriptor "1" <-- "0..*" Suscripcion : suscripciones
    CajaMensual "1" <-- "0..*" Suscripcion : caja contratada
    CajaMensual "1" *-- "0..*" CajaMensualProducto : composiciones
    Producto "1" <-- "0..*" CajaMensualProducto : producto
    Suscriptor --> DireccionSuscriptor
    Suscriptor --> PreferenciasOrganolepticas
    Suscripcion --> CategoriaClub
    Suscripcion --> EstadoSuscripcion
    CajaMensual --> CategoriaClub
```

### Reglas representadas

- Un `Suscriptor` puede tener muchas `Suscripcion`; eliminarlo elimina sus suscripciones (`CASCADE`).
- Una `Suscripcion` referencia una `CajaMensual`, que no puede eliminarse si está siendo utilizada (`RESTRICT`).
- `CajaMensualProducto` es la clase intermedia entre `CajaMensual` y `Producto` y guarda cantidad, orden y precio aplicado.
- Una caja elimina sus composiciones dependientes (`CASCADE`); un producto no puede eliminarse si tiene composiciones (`RESTRICT`).

## Funcionalidades actuales

Los controllers reciben las requests HTTP y delegan cada operación en un caso de uso del mismo módulo.

```mermaid
classDiagram
    direction LR

    class SuscriptoresController {
        +getSuscriptores()
        +getSuscriptorById(id)
        +createSuscriptor(payload)
        +updateSuscriptor(id, payload)
        +deleteSuscriptor(id)
    }

    class SuscripcionesController {
        +getSuscripciones()
        +getSuscripcionById(id)
        +getSuscripcionesBySuscriptor(suscriptorId)
        +createSuscripcion(payload)
        +updateSuscripcion(id, payload)
        +pauseSuscripcion(id)
        +cancelSuscripcion(id)
        +deleteSuscripcion(id)
    }

    class CajasMensualesController {
        +getCajasMensuales()
        +getCajaMensualById(id)
        +getCajasByMesAnio(mes, anio)
        +createCajaMensual(payload)
        +recommendCajaMensual(suscriptorId, preferencias)
        +updateCajaMensual(id, payload)
        +deleteCajaMensual(id)
    }

    class ProductosController {
        +getAll()
        +getById(id)
        +create(payload)
        +update(id, payload)
        +delete(id)
    }

    class SuscriptorUseCases {
        <<domain/useCase>>
    }

    class SuscripcionUseCases {
        <<domain/useCase>>
    }

    class CajaMensualUseCases {
        <<domain/useCase>>
    }

    class ProductoUseCases {
        <<domain/useCase>>
    }

    SuscriptoresController ..> SuscriptorUseCases : delega
    SuscripcionesController ..> SuscripcionUseCases : delega
    CajasMensualesController ..> CajaMensualUseCases : delega
    ProductosController ..> ProductoUseCases : delega
```

Los nombres agrupados (`SuscripcionUseCases`, por ejemplo) representan los casos de uso existentes en `domain/useCase/`; no son una clase única implementada en el código.

## Ubicación en el backend

| Elemento | Ubicación |
|---|---|
| Entidades y relaciones | `Backend/src/modules/*/infrastructure/*.entity.ts` |
| Controllers | `Backend/src/modules/*/presentation/controller.ts` |
| Casos de uso | `Backend/src/modules/*/domain/useCase/` |
| Repositories | `Backend/src/modules/*/infrastructure/*-repository.ts` |
