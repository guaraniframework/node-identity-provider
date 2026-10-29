import { PKCEName } from '../../../pkces/pkce-name.type';
import { AuthorizationRequest } from '../authorization-request';

/**
 * Parameters of the Code Authorization Request.
 */
export interface CodeAuthorizationRequest extends AuthorizationRequest<'code'> {
  /**
   * PKCE Code Challenge.
   */
  readonly code_challenge: string;

  /**
   * PKCE Code Challenge Method.
   */
  readonly code_challenge_method?: PKCEName;
}
