/**
 * Supported Logging levels.
 */
export enum LoggerLevel {
  /**
   * Indicates an error that crashes the system.
   */
  CRITICAL,

  /**
   * Indicates an error on the business rules of the system.
   */
  ERROR,

  /**
   * Indicates that something happened on the system that should be further investigated.
   */
  WARN,

  /**
   * Indicates an action performed by the system.
   */
  INFO,

  /**
   * Displays information for debugging purposes.
   */
  DEBUG,

  /**
   * Granular information about the process executed by the system.
   */
  TRACE,
}
