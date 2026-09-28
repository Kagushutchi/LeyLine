import PostgresTypeORM from "./postgres-typeorm";
import SqliteTypeORM from "./sqlite-typeorm";
import { envConfig } from "../../../config/env.config";

export default class DBEngineFactory
{
    static createDBEngine()
    {
        switch(envConfig.db.type)
        {
            case "postgres":
                return new PostgresTypeORM();
            case "sqlite":
                return new SqliteTypeORM();
            default:
                throw new Error("Unsupported/unconfigured database engine type");
        }
    }
}