/**
 * Levels of Logging supported.
 */
export enum LogLevel {
  /**
   * Indicates an error that crashes the system.
   */
  CRITICAL,

  /**
   * Indicates an error on the business rules of the system, but does not crash the system.
   */
  ERROR,

  /**
   * Indicates that something happened on the system that should be further investigated,
   * but does not affect the functionality of the system.
   */
  WARNING,

  /**
   * Indicates an action performed by the system.
   */
  INFORMATION,

  /**
   * Displays information for debugging purposes.
   */
  DEBUG,

  /**
   * Granular information about the process executed by the system.
   */
  TRACE,
}
