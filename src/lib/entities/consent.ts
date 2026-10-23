import { Client } from './client';
import { Scope } from './scope';
import { User } from './user';

/**
 * Identity Provider Consent Entity.
 */
export class Consent implements NodeJS.Dict<unknown> {
  /**
   * Consent Identifier.
   */
  public readonly id!: string;

  /**
   * Scopes granted by the Authenticated User.
   */
  public readonly scopes!: Scope[];

  /**
   * Consent Creation Date.
   */
  public readonly createdAt!: Date;

  /**
   * Consent Expiration Date.
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
