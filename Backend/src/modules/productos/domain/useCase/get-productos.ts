import { Producto } from '../../infrastructure/producto.entity';
import { ProductoRepository } from '../../infrastructure/producto-repository';

export default class GetProductos {
  private readonly repository = new ProductoRepository();

  async execute(): Promise<Producto[]> {
    return this.repository.findAll();
  }
}
