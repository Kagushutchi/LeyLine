import { dataSource } from '../../../app';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { Suscriptor } from './suscriptor.entity';

export class SuscriptorRepository extends BaseTypeORM<Suscriptor>
{
    constructor() 
    {
        super(dataSource.getRepository(Suscriptor));
    }

    async update(id: string | number, item: Partial<Suscriptor>): Promise<Suscriptor | null>
    {
        const repository = dataSource.getRepository(Suscriptor);
        await repository.update(String(id), item as any);
        return await repository.findOne({ where: { id: String(id) } });
    }
}
