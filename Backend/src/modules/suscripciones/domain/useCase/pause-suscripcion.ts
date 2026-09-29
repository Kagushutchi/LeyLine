import { Suscripcion } from "../../infrastructure/suscripcion.entity";
import { SuscripcionRepository } from "../../infrastructure/suscripcion-repository";
import { AppError } from "../../../../common/errors/app-error";

export default class PauseSuscripcion {
  private repository: SuscripcionRepository;

  constructor() {
    this.repository = new SuscripcionRepository();
  }

  async execute(id: string | number): Promise<Suscripcion> {
    const suscripcion = await this.repository.findOneById(id);
    if (!suscripcion) {
      throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    }
    if (suscripcion.estado !== 'activa') {
      throw new AppError(`Solo se pueden pausar suscripciones activas (estado actual: ${suscripcion.estado})`, 400);
    }

    const updated = await this.repository.update(id, { estado: 'pausada' });
    if (!updated) throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    return updated;
  }
}
