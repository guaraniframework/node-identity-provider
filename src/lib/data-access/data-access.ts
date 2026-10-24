import { Client } from '../entities/client';
import { Scope } from '../entities/scope';
import { Session } from '../entities/session';

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

  /**
   * Searches the application's storage for a Client containing the provided Identifier.
   *
   * @param id Client Identifier.
   * @returns Client based on the provided Identifier.
   */
  public abstract findClientById(id: string): Promise<Client | null>;

  /**
   * Searches the application's storage for a Session containing the provided Identifier.
   *
   * @param id Session Identifier.
   * @returns Session based on the provided Identifier.
   */
  public abstract findSessionById(id: string): Promise<Session | null>;

  /**
   * Returns the Scopes of the application's storage.
   *
   * @returns Scopes of the application's storage.
   */
  public abstract getScopes(): Promise<Scope[]>;

  /**
   * Returns the Scopes requested from the application's storage.
   *
   * @param scopes Scopes requested by the Client.
   * @returns Scopes requested from the application's storage.
   */
  public abstract getScopesByName(scopes: string[]): Promise<Scope[]>;
}
