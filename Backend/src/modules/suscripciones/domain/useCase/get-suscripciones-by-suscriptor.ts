import { Suscripcion } from "../../infrastructure/suscripcion.entity";
import { SuscripcionRepository } from "../../infrastructure/suscripcion-repository";

export class GetSuscripcionesBySuscriptor {
  private repository: SuscripcionRepository;

  constructor() {
    this.repository = new SuscripcionRepository();
  }

  async execute(suscriptorId: string): Promise<Suscripcion[]> {
    return await this.repository.findBySuscriptorId(suscriptorId);
  }
}
