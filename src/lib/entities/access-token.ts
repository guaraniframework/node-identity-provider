import { Client } from './client';
import { User } from './user';

/**
 * Base Access Token Entity.
 */
export abstract class AccessToken implements NodeJS.Dict<unknown> {
  /**
   * Access Token Identifier.
   */
  public readonly id!: string;

  /**
   * Scopes granted to the Client.
   */
  public readonly scopes!: string[];

  /**
   * Creation Date of the Access Token.
   */
  public readonly createdAt!: Date;

  /**
   * Expiration Date of the Access Token.
   */
  public readonly expiresAt!: Date;

  /**
   * Revocation Date of the Access Token.
   */
  public readonly revokedAt!: Date | null;

  /**
   * Date when the Access Token will become valid.
   */
  public readonly validAfter!: Date;

  /**
   * Client that requested the Access Token.
   */
  public readonly client!: Client;

  /**
   * User that granted authorization to the Client.
   */
  public readonly user!: User | null;

  /**
   * Additional Access Token Parameters.
   */
  [parameter: string]: unknown;
}
