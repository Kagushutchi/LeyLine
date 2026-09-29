import { dataSource } from '../../../app';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { Producto } from './producto.entity';

export class ProductoRepository extends BaseTypeORM<Producto> {
  constructor() {
    super(dataSource.getRepository(Producto));
  }

  async findAll(): Promise<Producto[]> {
    return dataSource.getRepository(Producto).find({
      relations: { composiciones: { cajaMensual: true } },
      order: { nombre: 'ASC' },
    });
  }

  async findOneById(id: string | number): Promise<Producto | null> {
    return dataSource.getRepository(Producto).findOne({
      where: { id: String(id) },
      relations: { composiciones: { cajaMensual: true } },
    });
  }
}
