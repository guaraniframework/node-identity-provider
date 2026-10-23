import { PKCEName } from '../../../pkces/pkce-name.type';
import { AuthorizationRequest } from '../authorization-request';

/**
 * Parameters of the Code & ID Token Authorization Request.
 */
export interface CodeIdTokenAuthorizationRequest extends AuthorizationRequest<'code id_token'> {
  /**
   * PKCE Code Challenge.
   */
  readonly code_challenge: string;

  /**
   * PKCE Code Challenge Method.
   */
  readonly code_challenge_method?: PKCEName;
}
