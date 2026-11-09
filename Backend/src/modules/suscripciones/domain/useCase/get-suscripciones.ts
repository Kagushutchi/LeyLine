import { Suscripcion } from "../../infrastructure/suscripcion.entity";
import { SuscripcionRepository } from "../../infrastructure/suscripcion-repository";

export default class GetSuscripciones {
  private repository: SuscripcionRepository;

  constructor() {
    this.repository = new SuscripcionRepository();
  }

  async execute(tenantId?: string, suscriptorId?: string): Promise<Suscripcion[]> {
    return await this.repository.findAll(tenantId, suscriptorId);
  }
}
