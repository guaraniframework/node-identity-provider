import { TokenResponse } from '../token-response';

/**
 * Parameters of the Password Token Response.
 */
export interface PasswordTokenResponse extends TokenResponse {
  /**
   * Refresh Token issued to the Client.
   */
  refresh_token?: string;
}
