import { AppError } from '../../../../common/errors/app-error';
import { Producto } from '../../infrastructure/producto.entity';
import { ProductoRepository } from '../../infrastructure/producto-repository';

export default class UpdateProducto {
  private readonly repository = new ProductoRepository();

  async execute(id: string | number, payload: Partial<Producto>): Promise<Producto> {
    const producto = await this.repository.findOneById(id);
    if (!producto) throw new AppError(`Producto con ID ${id} no encontrado`, 404);
    if (payload.precioReferencia !== undefined && payload.precioReferencia < 0) {
      throw new AppError('El precio de referencia no puede ser negativo', 400);
    }
    Object.assign(producto, payload);
    return this.repository.save(producto);
  }
}
