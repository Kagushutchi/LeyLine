import { MessageEnvelope, MessageHandler, MessageTransport } from './message-transport';
import { RabbitChannel, RabbitMqTransport, RabbitTopology } from './rabbitmq-transport';

export interface RabbitConnection {
  createConfirmChannel(): Promise<RabbitChannel>;
  createChannel(): Promise<RabbitChannel>;
  close(): Promise<void>;
  on(event: 'error' | 'close', listener: (...args: any[]) => void): this;
}
export interface RabbitConnector { connect(url: string): Promise<RabbitConnection>; }
export interface RabbitConnectionOptions {
  url: string;
  topology: RabbitTopology;
  maxConnectAttempts: number;
  reconnectDelayMs: number;
  onFailure: (error: Error) => void;
}

/** Reconnects consumers with bounded attempts; never repeats an uncertain publish. */
export class ReconnectingRabbitTransport implements MessageTransport {
  private transport?: RabbitMqTransport;
  private connection?: RabbitConnection;
  private connecting?: Promise<void>;
  private handler?: MessageHandler;
  private closed = false;
  private generation = 0;

  constructor(private readonly options: RabbitConnectionOptions, private readonly connector: RabbitConnector) {
    if (!options.url || !Number.isInteger(options.maxConnectAttempts) || options.maxConnectAttempts < 1 ||
      !Number.isFinite(options.reconnectDelayMs) || options.reconnectDelayMs < 0) throw new Error('Invalid RabbitMQ connection settings');
  }

  async start(): Promise<void> { await this.ensureConnected(); }
  async publish(message: MessageEnvelope): Promise<void> {
    await this.ensureConnected();
    if (!this.transport) throw new Error('RabbitMQ transport unavailable');
    return this.transport.publish(message);
  }
  async subscribe(handler: MessageHandler): Promise<void> {
    if (this.handler) throw new Error('Consumer already registered');
    this.handler = handler;
    try {
      const alreadyConnected = Boolean(this.transport);
      await this.ensureConnected();
      if (alreadyConnected && this.transport) await this.transport.subscribe(handler);
    } catch (error) {
      this.handler = undefined;
      throw error;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.closed) throw new Error('RabbitMQ transport is closed');
    if (this.transport) return;
    if (!this.connecting) {
      const generation = ++this.generation;
      const connecting = this.connectWithRetry(generation);
      this.connecting = connecting;
      void connecting.finally(() => { if (this.connecting === connecting) this.connecting = undefined; }).catch(() => {});
    }
    return this.connecting;
  }

  private async connectWithRetry(generation: number): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt < this.options.maxConnectAttempts && !this.closed; attempt++) {
      if (attempt) await new Promise(resolve => setTimeout(resolve, this.options.reconnectDelayMs));
      if (this.closed || generation !== this.generation) break;
      let connection: RabbitConnection | undefined;
      let adapter: RabbitMqTransport | undefined;
      let publisher: RabbitChannel | undefined;
      let established = false;
      let startupFailure: Error | undefined;
      const reportFailure = (error: Error) => {
        if (established) this.onDisconnected(generation, error);
        else startupFailure = error;
      };
      try {
        connection = await this.connector.connect(this.options.url);
        connection.on('error', reportFailure);
        connection.on('close', () => reportFailure(new Error('RabbitMQ connection closed')));
        publisher = await connection.createConfirmChannel();
        const consumer = await connection.createChannel();
        adapter = new RabbitMqTransport(publisher, consumer, this.options.topology, reportFailure);
        await adapter.initialize();
        if (this.handler) await adapter.subscribe(this.handler);
        if (startupFailure) throw startupFailure;
        if (this.closed || generation !== this.generation) {
          await adapter.close().catch(() => {}); await connection.close().catch(() => {});
          throw new Error('RabbitMQ connection attempt cancelled');
        }
        this.connection = connection; this.transport = adapter; established = true;
        return;
      } catch (error) {
        lastError = error;
        if (adapter) await adapter.close().catch(() => {});
        else if (publisher) await publisher.close().catch(() => {});
        if (connection) await connection.close().catch(() => {});
      }
    }
    if (this.closed) throw new Error('RabbitMQ transport is closed');
    throw new Error(`RabbitMQ connection failed after ${this.options.maxConnectAttempts} attempt(s)`, { cause: lastError });
  }

  private onDisconnected(generation: number, error: Error): void {
    if (this.closed || generation !== this.generation) return;
    this.generation++;
    const oldTransport = this.transport; const oldConnection = this.connection;
    this.transport = undefined; this.connection = undefined;
    oldTransport?.invalidate(error);
    this.options.onFailure(error);
    // A handler may be blocked after a disconnect; its cleanup must not prevent reconnect.
    if (oldTransport) void oldTransport.close().catch(() => {});
    if (oldConnection) void oldConnection.close().catch(() => {});
    void (async () => {
      if (!this.closed) {
        if (this.connecting) await this.connecting.catch(() => {});
        await this.ensureConnected();
      }
    })().catch((failure: Error) => this.options.onFailure(failure));
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true; this.generation++;
    if (this.connecting) await this.connecting.catch(() => {});
    const transport = this.transport; const connection = this.connection;
    this.transport = undefined; this.connection = undefined;
    let failure: unknown;
    if (transport) await transport.close().catch(error => { failure = error; });
    if (connection) await connection.close().catch(error => { failure ??= error; });
    if (failure) throw failure;
  }
}

export async function createRabbitMqTransport(options: RabbitConnectionOptions, connector?: RabbitConnector): Promise<ReconnectingRabbitTransport> {
  // Lazy loading keeps the optional transport out of applications that do not enable it.
  const driver: RabbitConnector = connector ?? require('amqplib');
  const transport = new ReconnectingRabbitTransport(options, driver);
  await transport.start();
  return transport;
}
