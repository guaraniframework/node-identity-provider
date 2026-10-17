import { LoggerLevel } from './logger-level.enum';

/**
 * The Logger is used to record information about the System's operations,
 * based on the severity of the operation being performed.
 */
export abstract class Logger {
  /**
   * Indicates the minimum severity that will be logged.
   */
  protected abstract readonly loggerLevel: LoggerLevel;

  /**
   * Logs a message with its parameters based on the provided Logger Level.
   *
   * @param loggerLevel Level of the message being logged.
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param parameters Parameters of the log.
   */
  protected abstract log(loggerLevel: LoggerLevel, message: string, location: string, ...parameters: unknown[]): void;

  /**
   * Logs an error that crashes the system.
   *
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param data Additional data to provide context to the log.
   * @param error Error instance to provide context to the log.
   * @param parameters Parameters of the log.
   */
  public critical(message: string, location: string, data: unknown, error: Error, ...parameters: unknown[]): void {
    this.log(LoggerLevel.CRITICAL, message, location, data, error, ...parameters);
  }

  /**
   * Logs an error caused by the business rules of the system.
   *
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param data Additional data to provide context to the log.
   * @param error Error instance to provide context to the log.
   * @param parameters Parameters of the log.
   */
  public error(message: string, location: string, data: unknown, error: Error, ...parameters: unknown[]): void {
    if (this.ensureLogLevel(LoggerLevel.ERROR)) {
      this.log(LoggerLevel.ERROR, message, location, data, error, ...parameters);
    }
  }

  /**
   * Logs a warning that indicates that something happened on the system that should be further investigated.
   *
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param data Additional data to provide context to the log.
   * @param error Error instance to provide context to the log.
   * @param parameters Parameters of the log.
   */
  public warn(message: string, location: string, data: unknown, error?: Error | null, ...parameters: unknown[]): void {
    if (this.ensureLogLevel(LoggerLevel.WARN)) {
      this.log(LoggerLevel.WARN, message, location, data, error, ...parameters);
    }
  }

  /**
   * Logs an action performed by the system.
   *
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param data Additional data to provide context to the log.
   * @param parameters Parameters of the log.
   */
  public info(message: string, location: string, data: unknown, ...parameters: unknown[]): void {
    if (this.ensureLogLevel(LoggerLevel.INFO)) {
      this.log(LoggerLevel.INFO, message, location, data, ...parameters);
    }
  }

  /**
   * Logs information for debugging purposes.
   *
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param data Additional data to provide context to the log.
   * @param parameters Parameters of the log.
   */
  public debug(message: string, location: string, data: unknown, ...parameters: unknown[]): void {
    if (this.ensureLogLevel(LoggerLevel.DEBUG)) {
      this.log(LoggerLevel.DEBUG, message, location, data, ...parameters);
    }
  }

  /**
   * Logs granular information about the process executed by the system.
   *
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param data Additional data to provide context to the log.
   * @param parameters Parameters of the log.
   */
  public trace(message: string, location: string, data: unknown, ...parameters: unknown[]): void {
    if (this.ensureLogLevel(LoggerLevel.TRACE)) {
      this.log(LoggerLevel.TRACE, message, location, data, ...parameters);
    }
  }

  /**
   * Checks if the provided Logger Level is allowed by the Logger.
   *
   * @param loggerLevel Logger Level to be checked.
   */
  private ensureLogLevel(loggerLevel: LoggerLevel): boolean {
    return loggerLevel <= this.loggerLevel;
  }
}
