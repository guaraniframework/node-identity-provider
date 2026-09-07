import { Injectable } from '@guarani/di';

import { LogLevel } from './log-level.enum';
import { Logger } from './logger';

/**
 * Default Logger.
 */
@Injectable()
export class ConsoleLogger extends Logger {
  /**
   * Level of the Logger.
   */
  protected readonly logLevel: LogLevel = LogLevel.TRACE;

  /**
   * Logs a message with its parameters based on the provided Log Level.
   *
   * @param logLevel Level of the message being logged.
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param parameters Parameters of the log.
   */
  protected log(logLevel: LogLevel, message: string, location: string, ...parameters: unknown[]): void {
    message = `[${new Date().toISOString()}] ${message}`;

    switch (logLevel) {
      case LogLevel.CRITICAL:
        console.error(`[Critical] ${message}`, location, ...parameters);
        break;

      case LogLevel.ERROR:
        console.error(`[Error] ${message}`, location, ...parameters);
        break;

      case LogLevel.WARNING:
        console.warn(`[Warning] ${message}`, location, ...parameters);
        break;

      case LogLevel.INFORMATION:
        console.info(`[Information] ${message}`, location, ...parameters);
        break;

      case LogLevel.DEBUG:
        console.debug(`[Debug] ${message}`, location, ...parameters);
        break;

      case LogLevel.TRACE:
        console.trace(`[Trace] ${message}`, location, ...parameters);
        break;
    }
  }
}
