---
name: ddd-module-generator
description: Genera, refactoriza o extiende módulos en TypeScript bajo la arquitectura DDD (Domain-Driven Design) divididos en domain (useCase), infrastructure (entity, repository) y presentation (controller, router), aplicando los patrones de diseño de common/ (BaseTypeORM, EventDispatcher, Strategy, Facade, AppError).
---

# Guía de Creación y Refactorización de Módulos DDD

Esta skill define el estándar y las pautas para crear o refactorizar módulos de backend siguiendo la arquitectura **DDD (Domain-Driven Design)** y los patrones de diseño de la carpeta `src/common/`.

---

## 1. Estructura de Directorios por Módulo

Cada módulo dentro de `Backend/src/modules/<nombre-modulo>/` debe organizarse estrictamente en tres capas:

```text
src/modules/<nombre-modulo>/
├── domain/
│   └── useCase/
│       ├── create-<entidad>.ts
│       ├── get-<entidades>.ts
│       ├── get-<entidad>-by-id.ts
│       ├── update-<entidad>.ts
│       ├── delete-<entidad>.ts
│       └── <casos-de-uso-especificos>.ts
├── infrastructure/
│   ├── <entidad>.entity.ts
│   └── <entidad>-repository.ts
└── presentation/
    ├── controller.ts
    └── <nombre-modulo>-router.ts
```

---

## 2. Capa de Infraestructura (`infrastructure/`)

### 2.1. Entidad TypeORM (`<entidad>.entity.ts`)
Define el esquema en base de datos con decoradores de TypeORM.

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('nombre_tabla')
export class MiEntidad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  campo: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2.2. Repositorio (`<entidad>-repository.ts`)
Hereda de `BaseTypeORM<T>` de `src/common/classes/base-typeorm-repository.ts` e inyecta la instancia del `dataSource`.

```typescript
import { dataSource } from '../../../app';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { MiEntidad } from './<entidad>.entity';

export class MiEntidadRepository extends BaseTypeORM<MiEntidad> {
  constructor() {
    super(dataSource.getRepository(MiEntidad));
  }

  // Métodos personalizados de consulta si son requeridos:
  public async findByCustomCriteria(criterio: string): Promise<MiEntidad[]> {
    return await dataSource.getRepository(MiEntidad).find({ where: { campo: criterio } as any });
  }
}
```

---

## 3. Capa de Dominio (`domain/useCase/`)

Cada caso de uso es una clase única e independiente con método `execute(...)`.

### 3.1. Caso de Uso de Creación (`create-<entidad>.ts`)
```typescript
import { IBaseRepository } from "../../../../common/interfaces/base-repository.interface";
import { MiEntidad } from "../../infrastructure/<entidad>.entity";
import { MiEntidadRepository } from "../../infrastructure/<entidad>-repository";
import { AppError } from "../../../../common/errors/app-error";

export default class CreateMiEntidad {
  private repository: IBaseRepository<MiEntidad>;

  constructor() {
    this.repository = new MiEntidadRepository();
  }

  async execute(payload: Partial<MiEntidad>): Promise<MiEntidad> {
    if (!payload.campo) {
      throw new AppError('El campo es requerido', 400);
    }
    return await this.repository.save(payload as MiEntidad);
  }
}
```

### 3.2. Caso de Uso de Obtención General (`get-<entidades>.ts`)
```typescript
import { IBaseRepository } from "../../../../common/interfaces/base-repository.interface";
import { MiEntidad } from "../../infrastructure/<entidad>.entity";
import { MiEntidadRepository } from "../../infrastructure/<entidad>-repository";

export default class GetMiEntidades {
  private repository: IBaseRepository<MiEntidad>;

  constructor() {
    this.repository = new MiEntidadRepository();
  }

  async execute(): Promise<MiEntidad[]> {
    return await this.repository.findAll();
  }
}
```

### 3.3. Caso de Uso por ID (`get-<entidad>-by-id.ts`)
```typescript
import { IBaseRepository } from "../../../../common/interfaces/base-repository.interface";
import { MiEntidad } from "../../infrastructure/<entidad>.entity";
import { MiEntidadRepository } from "../../infrastructure/<entidad>-repository";
import { AppError } from "../../../../common/errors/app-error";

export class GetMiEntidadById {
  private repository: IBaseRepository<MiEntidad>;

  constructor() {
    this.repository = new MiEntidadRepository();
  }

  async execute(id: string | number): Promise<MiEntidad> {
    const item = await this.repository.findOneById(id);
    if (!item) {
      throw new AppError('Registro no encontrado', 404);
    }
    return item;
  }
}
```

### 3.4. Caso de Uso de Actualización y Eliminación (`update-` / `delete-`)
```typescript
// Update
export default class UpdateMiEntidad {
  private repository: IBaseRepository<MiEntidad>;
  constructor() { this.repository = new MiEntidadRepository(); }
  async execute(id: string | number, payload: any): Promise<any> {
    return await this.repository.update(id, payload);
  }
}

// Delete
export default class DeleteMiEntidad {
  private repository: IBaseRepository<MiEntidad>;
  constructor() { this.repository = new MiEntidadRepository(); }
  async execute(id: string | number): Promise<any> {
    const result = await this.repository.delete(id);
    return { success: result, id };
  }
}
```

---

## 4. Capa de Presentación (`presentation/`)

### 4.1. Controlador (`controller.ts`)
Instancia y ejecuta los casos de uso correspondientes.

```typescript
import GetMiEntidades from "../domain/useCase/get-<entidades>";
import { GetMiEntidadById } from "../domain/useCase/get-<entidad>-by-id";
import CreateMiEntidad from "../domain/useCase/create-<entidad>";
import UpdateMiEntidad from "../domain/useCase/update-<entidad>";
import DeleteMiEntidad from "../domain/useCase/delete-<entidad>";

export default class MiEntidadController {
  async getAll(): Promise<any[]> {
    const useCase = new GetMiEntidades();
    return await useCase.execute();
  }

  async getById(id: string | number): Promise<any> {
    const useCase = new GetMiEntidadById();
    return await useCase.execute(id);
  }

  async create(payload: any): Promise<any> {
    const useCase = new CreateMiEntidad();
    return await useCase.execute(payload);
  }

  async update(id: string | number, payload: any): Promise<any> {
    const useCase = new UpdateMiEntidad();
    return await useCase.execute(id, payload);
  }

  async delete(id: string | number): Promise<any> {
    const useCase = new DeleteMiEntidad();
    return await useCase.execute(id);
  }
}
```

### 4.2. Router (`<nombre-modulo>-router.ts`)
Clase router que expone rutas HTTP y devuelve `router` encapsulado.

```typescript
import { Router, Request, Response, NextFunction } from "express";
import MiEntidadController from "./controller";

class MiEntidadRouter {
  private router: Router;
  private controller: MiEntidadController;
  private BASE_URL = '/';

  constructor() {
    this.controller = new MiEntidadController();
    this.router = this.createRouter();
  }

  public getRouter(): Router {
    return this.router;
  }

  public createRouter(): Router {
    const router = Router();

    router.get(this.BASE_URL, async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.controller.getAll();
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.get(`${this.BASE_URL}:id`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.controller.getById(req.params.id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.post(this.BASE_URL, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.controller.create(req.body);
        res.status(201).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.put(`${this.BASE_URL}:id`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.controller.update(req.params.id, req.body);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.delete(`${this.BASE_URL}:id`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.controller.delete(req.params.id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    return router;
  }
}

export default new MiEntidadRouter().getRouter();
```

---

## 5. Integración con el Sistema Global

1. **Registrar Entidad en Factory y Config**:
   - Agregar la entidad a `src/common/patterns/factory/entities.ts`
   - Importar la entidad en `src/config/database.config.ts` (dentro de las listas de entidades de `DatabaseFactory`).
2. **Montar Router en `src/app.ts`**:
   - `app.use('/api/<nombre-modulo>', <modulo>Router);`
3. **Patrones en `common/` a utilizar**:
   - `AppError` (`src/common/errors/app-error.ts`): Para errores de negocio con código HTTP (400, 404, etc.).
   - `EventDispatcher` (`src/common/patterns/events/event-dispatcher.ts`): Para publicar o suscribir eventos de dominio.
   - `IPaymentStrategy` (`src/common/patterns/strategies/payment-strategy.interface.ts`): Para operaciones de pago intercambiables.
   - `SubscriptionPackFacade` (`src/common/patterns/facades/subscription-pack.facade.ts`): Para orquestaciones complejas entre módulos.
