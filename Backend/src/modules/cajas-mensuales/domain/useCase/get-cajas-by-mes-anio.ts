import { CajaMensual } from "../../infrastructure/caja-mensual.entity";
import { CajaMensualRepository } from "../../infrastructure/caja-mensual-repository";

export class GetCajasByMesAnio {
  private repository: CajaMensualRepository;

  constructor() {
    this.repository = new CajaMensualRepository();
  }

  async execute(mes: number, anio: number): Promise<CajaMensual[]> {
    return await this.repository.findByMesAnio(mes, anio);
  }
}
