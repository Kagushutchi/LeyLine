import { getDataSource } from '../../../config/database.config';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { Producto } from './producto.entity';

export class ProductoRepository extends BaseTypeORM<Producto> {
  constructor() {
    super(getDataSource().getRepository(Producto));
  }

  async findAll(): Promise<Producto[]> {
    return getDataSource().getRepository(Producto).find({
      relations: { composiciones: { cajaMensual: true } },
      order: { nombre: 'ASC' },
    });
  }

  async findOneById(id: string | number): Promise<Producto | null> {
    return getDataSource().getRepository(Producto).findOne({
      where: { id: String(id) },
      relations: { composiciones: { cajaMensual: true } },
    });
  }
}
