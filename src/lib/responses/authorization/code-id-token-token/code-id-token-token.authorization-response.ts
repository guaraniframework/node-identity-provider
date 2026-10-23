import { AccessTokenType } from '../../../types/access-token-type.type';
import { AuthorizationResponse } from '../authorization-response';

/**
 * Parameters of the Code & ID Token & Token Authorization Response.
 */
export interface CodeIdTokenTokenAuthorizationResponse extends AuthorizationResponse {
  /**
   * Authorization Code Identifier issued to the Client.
   */
  code: string;

  /**
   * ID Token issued to the Client.
   */
  id_token: string;

  /**
   * Access Token issued to the Client.
   */
  access_token: string;

  /**
   * Type of the Access Token.
   */
  token_type: AccessTokenType;

  /**
   * Lifetime of the Access Token in seconds.
   */
  expires_in: number;

  /**
   * Scope granted to the Client.
   */
  scope: string;
}
