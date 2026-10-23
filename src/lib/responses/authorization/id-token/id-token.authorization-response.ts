import { AuthorizationResponse } from '../authorization-response';

/**
 * Parameters of the ID Token Authorization Response.
 */
export interface IdTokenAuthorizationResponse extends AuthorizationResponse {
  /**
   * ID Token issued to the Client.
   */
  id_token: string;
}
