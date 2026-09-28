import { Suscripcion } from "../../infrastructure/suscripcion.entity";
import { SuscripcionRepository } from "../../infrastructure/suscripcion-repository";
import { AppError } from "../../../../common/errors/app-error";

export default class CreateSuscripcion {
  private repository: SuscripcionRepository;

  constructor() {
    this.repository = new SuscripcionRepository();
  }

  async execute(payload: Partial<Suscripcion>): Promise<Suscripcion> {
    if (!payload.suscriptorId || !payload.categoria) {
      throw new AppError('suscriptorId y categoria son requeridos para dar de alta una suscripción', 400);
    }

    if (!payload.montoMensual || Number(payload.montoMensual) <= 0) {
      throw new AppError('El monto mensual debe ser mayor a 0', 400);
    }

    const suscripcion = new Suscripcion();
    suscripcion.suscriptorId = payload.suscriptorId;
    suscripcion.categoria = payload.categoria;
    suscripcion.montoMensual = payload.montoMensual;
    suscripcion.estado = payload.estado || 'activa';
    suscripcion.fechaInicio = payload.fechaInicio ? new Date(payload.fechaInicio) : new Date();
    suscripcion.proximoCobro = payload.proximoCobro ? new Date(payload.proximoCobro) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return await this.repository.save(suscripcion);
  }
}
