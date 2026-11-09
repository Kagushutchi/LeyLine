import { AppError } from '../../../../common/errors/app-error';
import { StockProducto } from '../../infrastructure/stock-producto.entity';
import { StockProductoRepository } from '../../infrastructure/stock-producto-repository';

export default class ConsultarInventario {
  private repository: StockProductoRepository;

  constructor() {
    this.repository = new StockProductoRepository();
  }

  async execute(productoId: string): Promise<StockProducto> {
    if (!productoId) {
      throw new AppError('El productoId es obligatorio para consultar el inventario', 400);
    }

    const stock = await this.repository.findByProductoId(productoId);
    if (!stock) {
      throw new AppError(`No hay inventario registrado para el producto ${productoId}`, 404);
    }

    return stock;
  }
}
