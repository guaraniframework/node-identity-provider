import { Client } from './client';
import { User } from './user';

/**
 * OAuth 2.0 Consent Entity.
 */
export abstract class Consent implements NodeJS.Dict<unknown> {
  /**
   * Identifier of the Consent.
   */
  public readonly id!: string;

  /**
   * Scopes granted by the Authenticated User.
   */
  public readonly scopes!: string[];

  /**
   * Creation Date of the Consent.
   */
  public readonly createdAt!: Date;

  /**
   * Expiration Date of the Consent.
   *
   * *note: a null value indicates that the consent does not expire.*
   */
  public readonly expiresAt!: Date | null;

  /**
   * Client authorized by the Authenticated User.
   */
  public readonly client!: Client;

  /**
   * Authenticated User.
   */
  public readonly user!: User;

  /**
   * Additional Consent Parameters.
   */
  [parameter: string]: unknown;
}
