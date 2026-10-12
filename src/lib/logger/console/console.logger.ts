import { Injectable, Optional } from '@guarani/di';

import { Logger } from '../logger';
import { LoggerLevel } from '../logger-level.enum';

/**
 * Implementation of the Console Logger.
 */
@Injectable()
export class ConsoleLogger extends Logger {
  /**
   * Indicates the minimum severity that will be logged.
   */
  protected readonly loggerLevel: LoggerLevel;

  /**
   * Instantiates a new Console Logger.
   *
   * @param [loggerLevel=LoggerLevel.TRACE] Indicates the minimum severity that will be logged.
   */
  public constructor(@Optional() loggerLevel: LoggerLevel = LoggerLevel.TRACE) {
    super();

    this.loggerLevel = loggerLevel;

    console.warn(
      `[Warning] [${new Date().toISOString()}] Using the default Console Logger. This is only recommended for development environments.`,
      'bd41fa1d-c43f-4e08-be2e-bbb5f6877dc5',
    );
  }

  /**
   * Logs a message with its parameters based on the provided Logger Level.
   *
   * @param loggerLevel Level of the message being logged.
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param parameters Parameters of the log.
   */
  protected log(logLevel: LoggerLevel, message: string, location: string, ...parameters: unknown[]): void {
    message = `[${new Date().toISOString()}] ${message}`;

    switch (logLevel) {
      case LoggerLevel.CRITICAL:
        console.error(`[Critical] ${message}`, location, ...parameters);
        break;

      case LoggerLevel.ERROR:
        console.error(`[Error] ${message}`, location, ...parameters);
        break;

      case LoggerLevel.WARN:
        console.warn(`[Warn] ${message}`, location, ...parameters);
        break;

      case LoggerLevel.INFO:
        console.info(`[Info] ${message}`, location, ...parameters);
        break;

      case LoggerLevel.DEBUG:
        console.debug(`[Debug] ${message}`, location, ...parameters);
        break;

      case LoggerLevel.TRACE:
        console.trace(`[Trace] ${message}`, location, ...parameters);
        break;
    }
  }
}
