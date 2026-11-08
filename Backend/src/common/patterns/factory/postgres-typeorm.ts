import { DataSource } from "typeorm";
import { IDBEngine } from "../../interfaces/db-engine.interface";
import { envConfig } from "../../../config/env.config";
import { entities } from "./entities";
import { AddSoftDelete1794000000000 } from "../../../migrations/1794000000000-AddSoftDelete";

export default class PostgresTypeORM implements IDBEngine<DataSource>
{
    private dataSource: DataSource;

    constructor()
    {
        this.dataSource = new DataSource({
            ...envConfig.db,
            type: "postgres",
            entities: entities,
            migrations: [AddSoftDelete1794000000000],
        });
    }


    async connectDB(): Promise<DataSource>
    {
        await this.dataSource.initialize();
        await this.dataSource.runMigrations();
        return this.dataSource;
    }

    async disconnectDB(): Promise<boolean>
    {
        this.dataSource.destroy();
        return true;
    }
    
    async isConnected(): Promise<boolean>
    {
        return this.dataSource.isInitialized;
    }

    async syncDB(): Promise<void>
    {
        return await this.dataSource.synchronize();
    }
}