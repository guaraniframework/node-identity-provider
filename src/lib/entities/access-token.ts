import { AccessTokenType } from '../types/access-token-type.type';
import { Client } from './client';
import { Scope } from './scope';
import { User } from './user';

/**
 * Identity Provider Access Token Entity.
 */
export class AccessToken implements NodeJS.Dict<unknown> {
  /**
   * Access Token Identifier.
   */
  public readonly id!: string;

  /**
   * Access Token Type.
   */
  public readonly type!: AccessTokenType;

  /**
   * Scopes granted to the Client.
   */
  public readonly scopes!: Scope[];

  /**
   * Access Token Creation Date.
   */
  public readonly createdAt!: Date;

  /**
   * Access Token Expiration Date.
   */
  public readonly expiresAt!: Date;

  /**
   * Access Token Revocation Date.
   */
  public revokedAt!: Date | null;

  /**
   * Date when the Access Token will become valid.
   */
  public readonly validAfter!: Date;

  /**
   * Client that requested the Access Token.
   */
  public readonly client!: Client;

  /**
   * User that granted the Access Token to the Client.
   */
  public readonly user!: User | null;

  /**
   * Additional Access Token Parameters.
   */
  [parameter: string]: unknown;
}
