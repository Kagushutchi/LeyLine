export interface IDomainEvent<T = unknown> {
  eventName: string;
  occurredOn: Date;
  payload: T;
}
