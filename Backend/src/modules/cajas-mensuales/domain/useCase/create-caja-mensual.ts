import { CajaMensual } from "../../infrastructure/caja-mensual.entity";
import { CajaMensualRepository } from "../../infrastructure/caja-mensual-repository";
import { AppError } from "../../../../common/errors/app-error";

export default class CreateCajaMensual {
  private repository: CajaMensualRepository;

  constructor() {
    this.repository = new CajaMensualRepository();
  }

  async execute(payload: Partial<CajaMensual>): Promise<CajaMensual> {
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
    caja.items = payload.items ?? [];
    caja.disponible = payload.disponible ?? true;

    return await this.repository.save(caja);
  }
}
