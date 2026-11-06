import { FindOptionsWhere, IsNull, ObjectLiteral, Repository } from "typeorm";
import { IBaseRepository } from "../interfaces/base-repository.interface";

abstract class BaseTypeORM<T extends ObjectLiteral> implements IBaseRepository<T> {
    protected constructor(private readonly repository: Repository<T>) { }

    async save(entity: T): Promise<T> {
        return await this.repository.save(entity);
    }

    async findOneById(id: string | number): Promise<T | null> {
        return await this.repository.findOne({ where: { id, deletedAt: IsNull() } } as FindOptionsWhere<any>);
    }

    async delete(id: string | number): Promise<T> {
        const el = await this.findOneById(id);

        if (!el) {
            throw "El registro a eliminar no existe";
        }

        await this.repository.softRemove(el);
        return el;
    }

    async update(id: string | number, entity: any): Promise<any> {
        const el = await this.findOneById(id);
        if (!el) {
            throw "El registro a actualizar no existe";
        }
        const { id: _id, deletedAt: _deletedAt, ...changes } = entity;
        Object.assign(el, changes);
        return await this.repository.save(el);
    }

    async findAll(): Promise<T[]> {
        return await this.repository.find({ where: { deletedAt: IsNull() } as unknown as FindOptionsWhere<T> });
    }

}

export default BaseTypeORM;
