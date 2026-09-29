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

export default class CreateCajaMensual {
  private repository: CajaMensualRepository;

  constructor() {
    this.repository = new CajaMensualRepository();
  }

  async execute(payload: Partial<CajaMensual> & { composiciones?: ComposicionPayload[] }): Promise<CajaMensual> {
    if (!payload.nombre || !payload.categoria || !payload.mes || !payload.anio) {
      throw new AppError('Faltan campos obligatorios para dar de alta la caja mensual (nombre, categoria, mes, anio)', 400);
    }

    if (payload.mes < 1 || payload.mes > 12) {
      throw new AppError('El mes debe estar comprendido entre 1 y 12', 400);
    }

    const caja = new CajaMensual();
    caja.nombre = payload.nombre;
    caja.categoria = payload.categoria;
    caja.mes = payload.mes;
    caja.anio = payload.anio;
    caja.descripcion = payload.descripcion;
    caja.precioBase = payload.precioBase ?? 0;
    caja.disponible = payload.disponible ?? true;
    caja.composiciones = await this.buildComposiciones(payload.composiciones ?? [], caja);

    return await this.repository.save(caja);
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
