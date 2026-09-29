import { Suscripcion } from "../../infrastructure/suscripcion.entity";
import { SuscripcionRepository } from "../../infrastructure/suscripcion-repository";
import { AppError } from "../../../../common/errors/app-error";

export default class CancelSuscripcion {
  private repository: SuscripcionRepository;

  constructor() {
    this.repository = new SuscripcionRepository();
  }

  async execute(id: string | number): Promise<Suscripcion> {
    const suscripcion = await this.repository.findOneById(id);
    if (!suscripcion) {
      throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    }
    if (suscripcion.estado === 'cancelada') {
      throw new AppError('La suscripción ya se encuentra cancelada', 400);
    }

    const updated = await this.repository.update(id, { estado: 'cancelada' });
    if (!updated) throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    return updated;
  }
}
