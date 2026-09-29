import { Suscripcion } from "../../infrastructure/suscripcion.entity";
import { SuscripcionRepository } from "../../infrastructure/suscripcion-repository";
import { AppError } from "../../../../common/errors/app-error";
import { dataSource } from "../../../../app";
import { Suscriptor } from "../../../suscriptores/infrastructure/suscriptor.entity";
import { CajaMensual } from "../../../cajas-mensuales/infrastructure/caja-mensual.entity";

export default class CreateSuscripcion {
  private repository: SuscripcionRepository;

  constructor() {
    this.repository = new SuscripcionRepository();
  }

  async execute(payload: Partial<Suscripcion>): Promise<Suscripcion> {
    if (!payload.suscriptorId || !payload.cajaMensualId) {
      throw new AppError('suscriptorId y cajaMensualId son requeridos para dar de alta una suscripción', 400);
    }

    if (payload.montoMensual === undefined || Number(payload.montoMensual) <= 0) {
      throw new AppError('El monto mensual debe ser mayor a 0', 400);
    }

    const suscriptor = await dataSource.getRepository(Suscriptor).findOneBy({ id: payload.suscriptorId });
    if (!suscriptor) throw new AppError(`Suscriptor con ID ${payload.suscriptorId} no encontrado`, 404);

    const cajaMensual = await dataSource.getRepository(CajaMensual).findOne({
      where: { id: payload.cajaMensualId },
      relations: { composiciones: { producto: true } },
    });
    if (!cajaMensual) throw new AppError(`Caja mensual con ID ${payload.cajaMensualId} no encontrada`, 404);
    if (!cajaMensual.disponible) throw new AppError('La caja mensual seleccionada no está disponible', 400);

    const estado = payload.estado || 'activa';
    if (!['activa', 'pausada', 'cancelada'].includes(estado)) {
      throw new AppError('El estado de la suscripción no es válido', 400);
    }

    const suscripcion = new Suscripcion();
    suscripcion.suscriptorId = suscriptor.id;
    suscripcion.suscriptor = suscriptor;
    suscripcion.cajaMensualId = cajaMensual.id;
    suscripcion.cajaMensual = cajaMensual;
    suscripcion.categoria = payload.categoria || cajaMensual.categoria;
    suscripcion.montoMensual = payload.montoMensual;
    suscripcion.estado = estado;
    suscripcion.fechaInicio = payload.fechaInicio ? new Date(payload.fechaInicio) : new Date();
    suscripcion.proximoCobro = payload.proximoCobro ? new Date(payload.proximoCobro) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return await this.repository.save(suscripcion);
  }
}
