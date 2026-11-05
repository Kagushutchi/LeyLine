import { AppError } from '../../../../common/errors/app-error';
import { StockProducto } from '../../infrastructure/stock-producto.entity';
import { StockProductoRepository } from '../../infrastructure/stock-producto-repository';

export interface ReservaStockResult {
  exito: boolean;
  productoId: string;
  cantidadSolicitada: number;
  cantidadDisponible: number;
  cantidadReservada: number;
  mensaje: string;
}

export default class ReservarStock {
  private repository: StockProductoRepository;

  constructor() {
    this.repository = new StockProductoRepository();
  }

  async execute(productoId: string, cantidad: number): Promise<ReservaStockResult> {
    if (!productoId) {
      throw new AppError('El productoId es obligatorio para reservar stock', 400);
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new AppError('La cantidad a reservar debe ser un entero mayor a cero', 400);
    }

    const stock = await this.repository.findByProductoId(productoId);
    if (!stock) {
      throw new AppError(`No hay inventario registrado para el producto ${productoId}`, 404);
    }

    if (stock.cantidadDisponible < cantidad) {
      return this.buildResult(stock, cantidad, false, 'Stock insuficiente para completar la reserva');
    }

    stock.cantidadDisponible -= cantidad;
    stock.cantidadReservada += cantidad;
    const actualizado: StockProducto = await this.repository.save(stock);

    return this.buildResult(actualizado, cantidad, true, 'Reserva confirmada');
  }

  private buildResult(
    stock: StockProducto,
    cantidad: number,
    exito: boolean,
    mensaje: string
  ): ReservaStockResult {
    return {
      exito,
      productoId: stock.productoId,
      cantidadSolicitada: cantidad,
      cantidadDisponible: stock.cantidadDisponible,
      cantidadReservada: stock.cantidadReservada,
      mensaje,
    };
  }
}
