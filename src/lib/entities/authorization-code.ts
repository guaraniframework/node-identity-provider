import { AuthorizationRequest } from '../requests/authorization/authorization-request';
import { Consent } from './consent';
import { Login } from './login';

/**
 * Identity Provider Authorization Code Entity.
 */
export class AuthorizationCode implements NodeJS.Dict<unknown> {
  /**
   * Authorization Code Identifier.
   */
  public readonly id!: string;

  /**
   * Authorization Request Parameters.
   */
  public readonly parameters!: AuthorizationRequest;

  /**
   * Authorization Code Creation Date.
   */
  public readonly createdAt!: Date;

  /**
   * Authorization Code Expiration Date.
   */
  public readonly expiresAt!: Date;

  /**
   * Authorization Code Revocation Date.
   */
  public revokedAt!: Date | null;

  /**
   * Date when the Authorization Code will become valid.
   */
  public readonly validAfter!: Date;

  /**
   * Login with the Authentication information of the User.
   */
  public readonly login!: Login;

  /**
   * Consent with the scopes granted by the User.
   */
  public readonly consent!: Consent;

  /**
   * Additional Authorization Code Parameters.
   */
  [parameter: string]: unknown;
}
