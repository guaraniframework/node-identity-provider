import { TokenRequest } from '../token-request';

/**
 * Parameters of the Refresh Token Token Request.
 */
export interface RefreshTokenTokenRequest extends TokenRequest<'refresh_token'> {
  /**
   * Refresh Token issued by the Identity Provider.
   */
  readonly refresh_token: string;

  /**
   * Scope requested by the Client.
   */
  readonly scope?: string;
}
