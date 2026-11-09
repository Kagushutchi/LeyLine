import { AppError } from '../../../../common/errors/app-error';
import { Producto } from '../../infrastructure/producto.entity';
import { ProductoRepository } from '../../infrastructure/producto-repository';

export default class GetProductoById {
  private readonly repository = new ProductoRepository();

  async execute(id: string | number, tenantId?: string): Promise<Producto> {
    const producto = await this.repository.findOneById(id);
    if (!producto) throw new AppError(`Producto con ID ${id} no encontrado`, 404);
    if (tenantId && producto.tenantId !== tenantId) {
      throw new AppError(`Producto con ID ${id} no encontrado`, 404);
    }
    return producto;
  }
}
