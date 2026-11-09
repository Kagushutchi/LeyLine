import { AppError } from '../../../../common/errors/app-error';
import { Producto } from '../../infrastructure/producto.entity';
import { ProductoRepository } from '../../infrastructure/producto-repository';
import { StockProductoRepository } from '../../../inventario/infrastructure/stock-producto-repository';

export default class CreateProducto {
  private readonly repository = new ProductoRepository();
  private readonly stockRepository = new StockProductoRepository();

  async execute(payload: Partial<Producto> & { stockInicial?: number }, tenantId?: string): Promise<Producto> {
    if (!payload.nombre || !payload.categoria || !payload.tipo || !payload.productor) {
      throw new AppError('Faltan campos obligatorios para crear el producto (nombre, categoria, tipo, productor)', 400);
    }

    if (payload.precioReferencia !== undefined && payload.precioReferencia < 0) {
      throw new AppError('El precio de referencia no puede ser negativo', 400);
    }

    const { stockInicial, ...productoPayload } = payload;

    const producto = new Producto();
    Object.assign(producto, productoPayload);
    producto.activo = payload.activo ?? true;
    if (tenantId) {
      producto.tenantId = tenantId;
    }
    const productoGuardado = await this.repository.save(producto);

    // Fix: todo producto creado por API necesita su registro de inventario para que
    // el servicio SOAP de consulta/reserva de stock pueda operar sobre él (antes sólo
    // existía para los productos cargados por el seed).
    await this.stockRepository.save({
      productoId: productoGuardado.id,
      productor: productoGuardado.productor,
      cantidadDisponible: stockInicial ?? 0,
      cantidadReservada: 0,
    } as any);

    return productoGuardado;
  }
}
