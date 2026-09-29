import { AppError } from '../../../../common/errors/app-error';
import { Producto } from '../../infrastructure/producto.entity';
import { ProductoRepository } from '../../infrastructure/producto-repository';

export default class CreateProducto {
  private readonly repository = new ProductoRepository();

  async execute(payload: Partial<Producto>): Promise<Producto> {
    if (!payload.nombre || !payload.categoria || !payload.tipo || !payload.productor) {
      throw new AppError('Faltan campos obligatorios para crear el producto (nombre, categoria, tipo, productor)', 400);
    }

    if (payload.precioReferencia !== undefined && payload.precioReferencia < 0) {
      throw new AppError('El precio de referencia no puede ser negativo', 400);
    }

    const producto = new Producto();
    Object.assign(producto, payload);
    producto.activo = payload.activo ?? true;
    return this.repository.save(producto);
  }
}
