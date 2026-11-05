import { getDataSource } from '../../../config/database.config';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { CajaMensual } from './caja-mensual.entity';

export class CajaMensualRepository extends BaseTypeORM<CajaMensual> {
  constructor() {
    super(getDataSource().getRepository(CajaMensual));
  }

  public async findByMesAnio(mes: number, anio: number): Promise<CajaMensual[]> {
    return await getDataSource().getRepository(CajaMensual).find({
      where: { mes, anio },
      relations: { composiciones: { producto: true } },
    });
  }

  public async findAll(): Promise<CajaMensual[]> {
    return await getDataSource().getRepository(CajaMensual).find({
      relations: { composiciones: { producto: true } },
      order: { anio: 'DESC', mes: 'DESC' },
    });
  }

  public async findOneById(id: string | number): Promise<CajaMensual | null> {
    return await getDataSource().getRepository(CajaMensual).findOne({
      where: { id: String(id) },
      relations: { composiciones: { producto: true } },
    });
  }
}
