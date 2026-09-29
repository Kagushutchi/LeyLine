import CreateProducto from '../domain/useCase/create-producto';
import DeleteProducto from '../domain/useCase/delete-producto';
import GetProductoById from '../domain/useCase/get-producto-by-id';
import GetProductos from '../domain/useCase/get-productos';
import UpdateProducto from '../domain/useCase/update-producto';

export default class ProductosController {
  async getAll() { return new GetProductos().execute(); }
  async getById(id: string) { return new GetProductoById().execute(id); }
  async create(payload: any) { return new CreateProducto().execute(payload); }
  async update(id: string, payload: any) { return new UpdateProducto().execute(id, payload); }
  async delete(id: string) { return new DeleteProducto().execute(id); }
}
