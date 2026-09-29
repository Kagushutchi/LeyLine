import { CajaMensual } from "../../infrastructure/caja-mensual.entity";
import { CajaMensualRepository } from "../../infrastructure/caja-mensual-repository";
import { AppError } from "../../../../common/errors/app-error";
import { CajaMensualProducto } from '../../infrastructure/caja-mensual-producto.entity';
import { ProductoRepository } from '../../../productos/infrastructure/producto-repository';

type ComposicionPayload = {
  productoId: string;
  cantidad: number;
  orden?: number;
  precioAplicado?: number;
};

export default class UpdateCajaMensual {
  private repository: CajaMensualRepository;

  constructor() {
    this.repository = new CajaMensualRepository();
  }

  async execute(id: string | number, payload: Partial<CajaMensual> & { composiciones?: ComposicionPayload[] }): Promise<CajaMensual> {
    const existing = await this.repository.findOneById(id);
    if (!existing) {
      throw new AppError(`Caja mensual con ID ${id} no encontrada`, 404);
    }

    const { composiciones, ...cajaPayload } = payload;
    Object.assign(existing, cajaPayload);
    if (composiciones !== undefined) {
      existing.composiciones = await this.buildComposiciones(composiciones, existing);
    }
    return await this.repository.save(existing);
  }

  private async buildComposiciones(payload: ComposicionPayload[], caja: CajaMensual): Promise<CajaMensualProducto[]> {
    const productoRepository = new ProductoRepository();
    const ids = new Set<string>();
    const composiciones: CajaMensualProducto[] = [];
    for (const item of payload) {
      if (!item.productoId || !Number.isInteger(item.cantidad) || item.cantidad <= 0) {
        throw new AppError('Cada composición debe indicar productoId y una cantidad entera mayor a cero', 400);
      }
      if (ids.has(item.productoId)) throw new AppError('Un producto no puede repetirse dentro de la misma caja', 400);
      const producto = await productoRepository.findOneById(item.productoId);
      if (!producto) throw new AppError(`Producto con ID ${item.productoId} no encontrado`, 404);
      ids.add(item.productoId);
      const composicion = new CajaMensualProducto();
      composicion.cajaMensual = caja;
      composicion.producto = producto;
      composicion.productoId = producto.id;
      composicion.cantidad = item.cantidad;
      composicion.orden = item.orden;
      composicion.precioAplicado = item.precioAplicado;
      composiciones.push(composicion);
    }
    return composiciones;
  }
}
