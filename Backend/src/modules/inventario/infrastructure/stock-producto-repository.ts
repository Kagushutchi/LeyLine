import { getDataSource } from '../../../config/database.config';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { StockProducto } from './stock-producto.entity';

export class StockProductoRepository extends BaseTypeORM<StockProducto> {
  constructor() {
    super(getDataSource().getRepository(StockProducto));
  }

  public async findByProductoId(productoId: string): Promise<StockProducto | null> {
    return await getDataSource().getRepository(StockProducto).findOne({
      where: { productoId },
      relations: { producto: true },
    });
  }
}
