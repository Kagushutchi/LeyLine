import { CajaMensual } from "../../infrastructure/caja-mensual.entity";
import { CajaMensualRepository } from "../../infrastructure/caja-mensual-repository";

export default class GetCajasMensuales {
  private repository: CajaMensualRepository;

  constructor() {
    this.repository = new CajaMensualRepository();
  }

  async execute(): Promise<CajaMensual[]> {
    return await this.repository.findAll();
  }
}
