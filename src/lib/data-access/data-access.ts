/**
 * The Data Access is used for the operations of the Identity Provider that need to interact with external systems.
 */
export abstract class DataAccess {
  /**
   * Runs the provided sequence of operations as an atomic operation.
   *
   * @param operations Contains the sequence of operations to be run as an atomic operation.
   * @returns Returns the result of the Operations function.
   */
  public abstract atomic<T>(operations: () => Promise<T>): Promise<T>;
}
