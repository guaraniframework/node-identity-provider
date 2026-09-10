import { Client } from '../entities/client';

/**
 * Base class for the Client Service.
 */
export abstract class ClientService {
  /**
   * Searches the application's storage for a Client containing the provided Identifier.
   *
   * @param id Identifier of the Client.
   * @returns Client based on the provided Identifier.
   */
  public abstract findOne(id: string): Promise<Client | null>;
}
