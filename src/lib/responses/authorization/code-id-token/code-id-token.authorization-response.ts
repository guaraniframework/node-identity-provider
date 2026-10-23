import { AuthorizationResponse } from '../authorization-response';

/**
 * Parameters of the Code & ID Token Authorization Response.
 */
export interface CodeIdTokenAuthorizationResponse extends AuthorizationResponse {
  /**
   * Authorization Code Identifier issued to the Client.
   */
  code: string;

  /**
   * ID Token issued to the Client.
   */
  id_token: string;
}
