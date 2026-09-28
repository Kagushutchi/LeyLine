import { CajaMensual } from "../../infrastructure/caja-mensual.entity";
import { CajaMensualRepository } from "../../infrastructure/caja-mensual-repository";
import { AppError } from "../../../../common/errors/app-error";

export default class UpdateCajaMensual {
  private repository: CajaMensualRepository;

  constructor() {
    this.repository = new CajaMensualRepository();
  }

  async execute(id: string | number, payload: Partial<CajaMensual>): Promise<CajaMensual> {
    const existing = await this.repository.findOneById(id);
    if (!existing) {
      throw new AppError(`Caja mensual con ID ${id} no encontrada`, 404);
    }

    return await this.repository.update(id, payload);
  }
}
