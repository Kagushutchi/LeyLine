import { IDomainEvent } from './domain-event.interface';
import { logger } from '../../utils/logger';

type EventHandler<T = unknown> = (event: IDomainEvent<T>) => Promise<void> | void;

/**
 * Patrón Observer: EventDispatcher
 * Permite suscribir observadores y emitir eventos de dominio de forma desacoplada
 * (Ej: PagoRecurrenteAprobado -> Dispara empaque de caja).
 */
export class EventDispatcher {
  private static instance: EventDispatcher;
  private handlers: Map<string, EventHandler[]> = new Map();

  private constructor() {}

  public static getInstance(): EventDispatcher {
    if (!EventDispatcher.instance) {
      EventDispatcher.instance = new EventDispatcher();
    }
    return EventDispatcher.instance;
  }

  public subscribe<T>(eventName: string, handler: EventHandler<T>): void {
    const currentHandlers = this.handlers.get(eventName) || [];
    this.handlers.set(eventName, [...currentHandlers, handler as EventHandler]);
  }

  public async dispatch<T>(event: IDomainEvent<T>): Promise<void> {
    logger.info(`Despachando evento de dominio: ${event.eventName}`);
    const handlers = this.handlers.get(event.eventName) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        logger.error(`Error procesando handler para ${event.eventName}:`, error);
      }
    }
  }
}
