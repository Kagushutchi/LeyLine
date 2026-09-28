import { dataSource } from '../../../app';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { Suscriptor } from './suscriptor.entity';

export class SuscriptorRepository extends BaseTypeORM<Suscriptor>
{
    constructor() 
    {
        super(dataSource.getRepository(Suscriptor));
    }
}