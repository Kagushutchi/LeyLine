import CreateProducto from '../domain/useCase/create-producto';
import DeleteProducto from '../domain/useCase/delete-producto';
import GetProductoById from '../domain/useCase/get-producto-by-id';
import GetProductos from '../domain/useCase/get-productos';
import UpdateProducto from '../domain/useCase/update-producto';

export default class ProductosController {
  async getAll() { return new GetProductos().execute(); }
  async getById(id: string) { return new GetProductoById().execute(id); }
  async create(payload: any, tenantId?: string) { return new CreateProducto().execute(payload, tenantId); }
  async update(id: string, payload: any, tenantId?: string) { return new UpdateProducto().execute(id, payload, tenantId); }
  async delete(id: string, tenantId?: string) { return new DeleteProducto().execute(id, tenantId); }
}
