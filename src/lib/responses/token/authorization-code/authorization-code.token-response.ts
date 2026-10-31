import { TokenResponse } from '../token-response';

/**
 * Parameters of the Authorization Code Token Response.
 */
export interface AuthorizationCodeTokenResponse extends TokenResponse {
  /**
   * Refresh Token issued to the Client.
   */
  refresh_token?: string;

  /**
   * ID Token issued to the Client.
   */
  id_token?: string;
}
