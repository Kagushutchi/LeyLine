import { DeliveryOutcome, MessageEnvelope, MessageHandler } from './message-transport';

/** Enruta cada mensaje al consumidor de su `type`; un tipo desconocido se descarta (dead-letter). */
export function createMessageRouter(handlers: Record<string, (message: MessageEnvelope) => Promise<DeliveryOutcome>>): MessageHandler {
  return async (message) => {
    const handler = Object.prototype.hasOwnProperty.call(handlers, message.type) ? handlers[message.type] : undefined;
    return handler ? handler(message) : 'reject';
  };
}
