import { CajaMensual } from "../../infrastructure/caja-mensual.entity";
import { CajaMensualRepository } from "../../infrastructure/caja-mensual-repository";
import { AppError } from "../../../../common/errors/app-error";

export default class DeleteCajaMensual {
  private repository: CajaMensualRepository;

  constructor() {
    this.repository = new CajaMensualRepository();
  }

  async execute(id: string | number): Promise<any> {
    const existing = await this.repository.findOneById(id);
    if (!existing) {
      throw new AppError(`Caja mensual con ID ${id} no encontrada`, 404);
    }

    const result = await this.repository.delete(id);
    return { success: result, id };
  }
}
