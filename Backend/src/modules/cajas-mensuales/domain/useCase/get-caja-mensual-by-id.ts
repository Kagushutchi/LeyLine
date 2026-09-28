import { CajaMensual } from "../../infrastructure/caja-mensual.entity";
import { CajaMensualRepository } from "../../infrastructure/caja-mensual-repository";
import { AppError } from "../../../../common/errors/app-error";

export class GetCajaMensualById {
  private repository: CajaMensualRepository;

  constructor() {
    this.repository = new CajaMensualRepository();
  }

  async execute(id: string | number): Promise<CajaMensual> {
    const caja = await this.repository.findOneById(id);
    if (!caja) {
      throw new AppError(`Caja mensual con ID ${id} no encontrada`, 404);
    }
    return caja;
  }
}
