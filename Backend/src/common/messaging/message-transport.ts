/** Stable message identity must be preserved when publication is retried. */
export interface MessageEnvelope<T = unknown> {
  messageId: string;
  type: string;
  version: number;
  requestId: string;
  tenantId: string;
  correlationId: string;
  payload: T;
}

export type DeliveryOutcome = 'ack' | 'retry' | 'reject';
export type MessageHandler = (message: MessageEnvelope) => Promise<DeliveryOutcome>;

export interface MessageTransport {
  /** Resolves only after the broker confirms a routed publication. */
  publish(message: MessageEnvelope): Promise<void>;
  subscribe(handler: MessageHandler): Promise<void>;
  close(): Promise<void>;
}
