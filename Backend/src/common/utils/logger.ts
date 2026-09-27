/**
 * Componente de Utilidad: Logger Reutilizable
 * Centraliza la salida de logs formateados con niveles y timestamp.
 */
export class Logger {
  private context: string;

  constructor(context = 'App') {
    this.context = context;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}]: ${message}`;
  }

  public info(message: string, ...optionalParams: unknown[]): void {
    console.log(this.formatMessage('info', message), ...optionalParams);
  }

  public warn(message: string, ...optionalParams: unknown[]): void {
    console.warn(this.formatMessage('warn', message), ...optionalParams);
  }

  public error(message: string, ...optionalParams: unknown[]): void {
    console.error(this.formatMessage('error', message), ...optionalParams);
  }

  public debug(message: string, ...optionalParams: unknown[]): void {
    console.debug(this.formatMessage('debug', message), ...optionalParams);
  }
}

export const logger = new Logger('Global');
