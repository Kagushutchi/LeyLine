import { Suscripcion } from "../../infrastructure/suscripcion.entity";
import { SuscripcionRepository } from "../../infrastructure/suscripcion-repository";
import { AppError } from "../../../../common/errors/app-error";
import { dataSource } from "../../../../app";
import { Suscriptor } from "../../../suscriptores/infrastructure/suscriptor.entity";
import { CajaMensual } from "../../../cajas-mensuales/infrastructure/caja-mensual.entity";

export default class UpdateSuscripcion {
  private repository: SuscripcionRepository;

  constructor() {
    this.repository = new SuscripcionRepository();
  }

  async execute(id: string | number, payload: Partial<Suscripcion>): Promise<Suscripcion> {
    const existing = await this.repository.findOneById(id);
    if (!existing) {
      throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    }

    const changes: Partial<Suscripcion> = {};
    if (payload.suscriptorId !== undefined) {
      if (typeof payload.suscriptorId !== 'string' || !payload.suscriptorId.trim()) {
        throw new AppError('suscriptorId debe ser un identificador válido', 400);
      }
      const suscriptor = await dataSource.getRepository(Suscriptor).findOneBy({ id: payload.suscriptorId });
      if (!suscriptor) throw new AppError(`Suscriptor con ID ${payload.suscriptorId} no encontrado`, 404);
      changes.suscriptor = suscriptor;
      changes.suscriptorId = suscriptor.id;
    }
    if (payload.cajaMensualId !== undefined) {
      if (typeof payload.cajaMensualId !== 'string' || !payload.cajaMensualId.trim()) {
        throw new AppError('cajaMensualId debe ser un identificador válido', 400);
      }
      const caja = await dataSource.getRepository(CajaMensual).findOneBy({ id: payload.cajaMensualId });
      if (!caja) throw new AppError(`Caja mensual con ID ${payload.cajaMensualId} no encontrada`, 404);
      if (!caja.disponible) throw new AppError('La caja mensual seleccionada no está disponible', 400);
      changes.cajaMensual = caja;
      changes.cajaMensualId = caja.id;
    }
    for (const key of ['categoria', 'estado', 'montoMensual', 'fechaInicio', 'proximoCobro'] as const) {
      if (payload[key] !== undefined) (changes as any)[key] = payload[key];
    }
    const updated = await this.repository.update(id, changes);
    if (!updated) throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    return updated;
  }
}
