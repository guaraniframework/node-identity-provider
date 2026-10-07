import { LogLevel } from './log-level.enum';

/**
 * Base class for the Logger.
 */
export abstract class Logger {
  /**
   * Level of the Logger.
   */
  protected abstract readonly logLevel: LogLevel;

  /**
   * Logs a message with its parameters based on the provided Log Level.
   *
   * @param logLevel Level of the message being logged.
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param parameters Parameters of the log.
   */
  protected abstract log(logLevel: LogLevel, message: string, location: string, ...parameters: unknown[]): void;

  /**
   * Indicates an error that crashes the system.
   *
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param data Additional data to provide context to the log.
   * @param error Error instance to provide context to the log.
   * @param parameters Parameters of the log.
   */
  public critical(message: string, location: string, data?: unknown, error?: Error, ...parameters: unknown[]): void {
    this.log(LogLevel.CRITICAL, message, location, data, error, ...parameters);
  }

  /**
   * Indicates an error caused by the business rules of the system, but does not crash it.
   *
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param data Additional data to provide context to the log.
   * @param error Error instance to provide context to the log.
   * @param parameters Parameters of the log.
   */
  public error(message: string, location: string, data?: unknown, error?: Error, ...parameters: unknown[]): void {
    if (this.ensureLogLevel(LogLevel.ERROR)) {
      this.log(LogLevel.ERROR, message, location, data, error, ...parameters);
    }
  }

  /**
   * Indicates that something happened on the system that should be further investigated, but does not crash it.
   *
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param data Additional data to provide context to the log.
   * @param error Error instance to provide context to the log.
   * @param parameters Parameters of the log.
   */
  public warning(message: string, location: string, data?: unknown, error?: Error, ...parameters: unknown[]): void {
    if (this.ensureLogLevel(LogLevel.WARNING)) {
      this.log(LogLevel.WARNING, message, location, data, error, ...parameters);
    }
  }

  /**
   * Indicates an action performed by the system.
   *
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param data Additional data to provide context to the log.
   * @param parameters Parameters of the log.
   */
  public information(message: string, location: string, data?: unknown, ...parameters: unknown[]): void {
    if (this.ensureLogLevel(LogLevel.INFORMATION)) {
      this.log(LogLevel.INFORMATION, message, location, data, ...parameters);
    }
  }

  /**
   * Displays information for debugging purposes.
   *
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param data Additional data to provide context to the log.
   * @param parameters Parameters of the log.
   */
  public debug(message: string, location: string, data?: unknown, ...parameters: unknown[]): void {
    if (this.ensureLogLevel(LogLevel.DEBUG)) {
      this.log(LogLevel.DEBUG, message, location, data, ...parameters);
    }
  }

  /**
   * Granular information about the process executed by the system.
   *
   * @param message Message of the log.
   * @param location Code Location of the log.
   * @param data Additional data to provide context to the log.
   * @param parameters Parameters of the log.
   */
  public trace(message: string, location: string, data?: unknown, ...parameters: unknown[]): void {
    if (this.ensureLogLevel(LogLevel.TRACE)) {
      this.log(LogLevel.TRACE, message, location, data, ...parameters);
    }
  }

  /**
   * Checks if the provided Log Level is allowed by the Logger.
   *
   * @param logLevel Log Level to be checked.
   */
  private ensureLogLevel(logLevel: LogLevel): boolean {
    return logLevel <= this.logLevel;
  }
}
