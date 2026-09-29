import { AppError } from '../../../../common/errors/app-error';
import { ProductoRepository } from '../../infrastructure/producto-repository';

export default class DeleteProducto {
  private readonly repository = new ProductoRepository();

  async execute(id: string | number): Promise<{ success: boolean; id: string | number }> {
    const producto = await this.repository.findOneById(id);
    if (!producto) throw new AppError(`Producto con ID ${id} no encontrado`, 404);
    await this.repository.delete(id);
    return { success: true, id };
  }
}
