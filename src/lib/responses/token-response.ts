import { AccessTokenType } from '../types/access-token-type.type';

/**
 * Parameters of the Token Response.
 */
export interface TokenResponse extends NodeJS.Dict<string | number | boolean | null> {
  /**
   * Access Token issued to the Client.
   */
  readonly access_token: string;

  /**
   * Type of the Access Token.
   */
  readonly token_type: AccessTokenType;

  /**
   * Lifetime of the Access Token in seconds.
   */
  readonly expires_in: number;

  /**
   * Scope granted to the Client.
   */
  readonly scope: string;
}
