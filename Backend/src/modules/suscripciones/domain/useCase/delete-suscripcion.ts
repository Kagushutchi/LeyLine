import { Suscripcion } from "../../infrastructure/suscripcion.entity";
import { SuscripcionRepository } from "../../infrastructure/suscripcion-repository";
import { AppError } from "../../../../common/errors/app-error";

export default class DeleteSuscripcion {
  private repository: SuscripcionRepository;

  constructor() {
    this.repository = new SuscripcionRepository();
  }

  async execute(id: string | number): Promise<any> {
    const existing = await this.repository.findOneById(id);
    if (!existing) {
      throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    }
    const result = await this.repository.delete(id);
    return { success: result, id };
  }
}
