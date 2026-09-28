export interface IDBEngine<T>
{
    connectDB(): Promise<T>;
    disconnectDB(): Promise<boolean>;
    isConnected(): Promise<boolean>;
    syncDB(): Promise<void>;
}