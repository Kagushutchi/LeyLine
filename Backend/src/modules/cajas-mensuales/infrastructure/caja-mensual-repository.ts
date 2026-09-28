import { dataSource } from '../../../app';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { CajaMensual } from './caja-mensual.entity';

export class CajaMensualRepository extends BaseTypeORM<CajaMensual> {
  constructor() {
    super(dataSource.getRepository(CajaMensual));
  }

  public async findByMesAnio(mes: number, anio: number): Promise<CajaMensual[]> {
    return await dataSource.getRepository(CajaMensual).find({
      where: { mes, anio },
    });
  }
}
