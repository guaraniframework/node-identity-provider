import { TokenResponse } from '../token-response';

/**
 * Parameters of the Refresh Token Token Response.
 */
export interface RefreshTokenTokenResponse extends TokenResponse {
  /**
   * Refresh Token issued to the Client.
   */
  refresh_token: string;
}
