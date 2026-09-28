import { DataSource } from "typeorm";
import { IDBEngine } from "../../interfaces/db-engine.interface";
import { envConfig } from "../../../config/env.config";
import { entities } from "./entities";

export default class PostgresTypeORM implements IDBEngine<DataSource>
{
    private dataSource: DataSource;

    constructor()
    {
        this.dataSource = new DataSource({
            ...envConfig.db,
            type: "postgres",
            entities: entities
        });
    }


    async connectDB(): Promise<DataSource>
    {
        await this.dataSource.initialize();
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