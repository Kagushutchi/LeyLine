import { Producto } from '../../infrastructure/producto.entity';
import { ProductoRepository } from '../../infrastructure/producto-repository';

export default class GetProductos {
  private readonly repository = new ProductoRepository();

  async execute(tenantId?: string): Promise<Producto[]> {
    return this.repository.findAll(tenantId);
  }
}
