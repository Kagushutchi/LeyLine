import { AppError } from '../../../../common/errors/app-error';
import { StockProducto } from '../../infrastructure/stock-producto.entity';
import { StockProductoRepository } from '../../infrastructure/stock-producto-repository';

export default class ActualizarInventario {
  private repository: StockProductoRepository;

  constructor() {
    this.repository = new StockProductoRepository();
  }

  async execute(productoId: string, cantidadDisponible: number): Promise<StockProducto> {
    if (!productoId) {
      throw new AppError('El productoId es obligatorio para actualizar el inventario', 400);
    }
    if (!Number.isInteger(cantidadDisponible) || cantidadDisponible < 0) {
      throw new AppError('La cantidad disponible debe ser un entero mayor o igual a cero', 400);
    }

    const stock = await this.repository.findByProductoId(productoId);
    if (!stock) {
      throw new AppError(`No hay inventario registrado para el producto ${productoId}`, 404);
    }

    stock.cantidadDisponible = cantidadDisponible;
    return await this.repository.save(stock);
  }
}
