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

Los controllers representan las operaciones HTTP disponibles y los repositories representan el acceso a persistencia. Los casos de uso existen entre ambas capas, pero se omiten de este gráfico para mantenerlo legible.

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

    class BaseTypeORM {
        +save(entity)
        +findOneById(id)
        +findAll()
        +update(id, entity)
        +delete(id)
    }

    class SuscriptorRepository {
        +update(id, item)
    }
    class SuscripcionRepository {
        +findAll()
        +findOneById(id)
        +findBySuscriptorId(suscriptorId)
        +update(id, entity)
    }
    class CajaMensualRepository {
        +findAll()
        +findOneById(id)
        +findByMesAnio(mes, anio)
    }
    class ProductoRepository {
        +findAll()
        +findOneById(id)
    }

    SuscriptoresController ..> SuscriptorRepository : vía casos de uso
    SuscripcionesController ..> SuscripcionRepository : vía casos de uso
    CajasMensualesController ..> CajaMensualRepository : vía casos de uso
    ProductosController ..> ProductoRepository : vía casos de uso

    SuscriptorRepository --|> BaseTypeORM
    SuscripcionRepository --|> BaseTypeORM
    CajaMensualRepository --|> BaseTypeORM
    ProductoRepository --|> BaseTypeORM
```

Los métodos de los controllers están tomados del código real. La relación punteada indica el flujo simplificado `Controller → casos de uso → Repository`; no implica que el controller instancie directamente el repository. Los métodos comunes de `BaseTypeORM` son heredados por los cuatro repositories.

## Ubicación en el backend

| Elemento | Ubicación |
|---|---|
| Entidades y relaciones | `Backend/src/modules/*/infrastructure/*.entity.ts` |
| Controllers | `Backend/src/modules/*/presentation/controller.ts` |
| Casos de uso | `Backend/src/modules/*/domain/useCase/` |
| Repositories | `Backend/src/modules/*/infrastructure/*-repository.ts` |
| Repository base | `Backend/src/common/classes/base-typeorm-repository.ts` |
