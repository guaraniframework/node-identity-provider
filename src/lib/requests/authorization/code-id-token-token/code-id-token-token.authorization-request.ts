import { PKCEName } from '../../../pkces/pkce-name.type';
import { AuthorizationRequest } from '../authorization-request';

/**
 * Parameters of the Code & ID Token & Token Authorization Request.
 */
export interface CodeIdTokenTokenAuthorizationRequest extends AuthorizationRequest<'code id_token token'> {
  /**
   * PKCE Code Challenge.
   */
  readonly code_challenge: string;

  /**
   * PKCE Code Challenge Method.
   */
  readonly code_challenge_method?: PKCEName;
}
