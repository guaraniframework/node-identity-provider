import { Client } from './client';
import { Scope } from './scope';
import { User } from './user';

/**
 * Identity Provider Refresh Token Entity.
 */
export class RefreshToken implements NodeJS.Dict<unknown> {
  /**
   * Refresh Token Identifier.
   */
  public readonly id!: string;

  /**
   * Scopes granted to the Client.
   */
  public readonly scopes!: Scope[];

  /**
   * Refresh Token Creation Date.
   */
  public readonly createdAt!: Date;

  /**
   * Refresh Token Expiration Date.
   */
  public readonly expiresAt!: Date;

  /**
   * Refresh Token Revocation Date.
   */
  public revokedAt!: Date | null;

  /**
   * Date when the Refresh Token will become valid.
   */
  public readonly validAfter!: Date;

  /**
   * Client that requested the Refresh Token.
   */
  public readonly client!: Client;

  /**
   * User that granted the Refresh Token to the Client.
   */
  public readonly user!: User;

  /**
   * Additional Refresh Token Parameters.
   */
  [parameter: string]: unknown;
}
