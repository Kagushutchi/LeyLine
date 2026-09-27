/**
 * Componente de Acceso a Datos: Interfaz Base de Repositorio (DAO / Repository Pattern)
 * Desacopla la lógica de negocio de la tecnología específica de persistencia.
 */
export interface IBaseRepository<T> {
  findById(id: string | number): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(item: Partial<T>): Promise<T>;
  update(id: string | number, item: Partial<T>): Promise<T | null>;
  delete(id: string | number): Promise<boolean>;
}
