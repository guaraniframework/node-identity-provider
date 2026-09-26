import { CodeAuthorizationRequest } from '../requests/authorization/code/code.authorization-request';
import { Consent } from './consent';
import { Login } from './login';

/**
 * Base Authorization Code Entity.
 */
export abstract class AuthorizationCode implements NodeJS.Dict<unknown> {
  /**
   * Identifier of the Authorization Code.
   */
  public readonly id!: string;

  /**
   * Parameters of the Authorization Request.
   */
  public readonly parameters!: CodeAuthorizationRequest;

  /**
   * Creation Date of the Authorization Code.
   */
  public readonly createdAt!: Date;

  /**
   * Expiration Date of the Authorization Code.
   */
  public readonly expiresAt!: Date;

  /**
   * Revocation Date of the Authorization Code.
   */
  public readonly revokedAt!: Date | null;

  /**
   * Date when the Authorization Code will become valid.
   */
  public readonly validAfter!: Date;

  /**
   * Login with the Authentication information of the End User.
   */
  public readonly login!: Login;

  /**
   * Consent with the scopes granted by the End User.
   */
  public readonly consent!: Consent;

  /**
   * Additional Authorization Code Parameters.
   */
  [parameter: string]: unknown;
}
