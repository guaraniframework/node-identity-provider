import { PKCEName } from '../pkces/pkce-name.type';
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
   * PKCE Code Challenge.
   */
  public readonly codeChallenge!: string;

  /**
   * PKCE Code Challenge Method.
   */
  public readonly codeChallengeMethod!: PKCEName;

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
