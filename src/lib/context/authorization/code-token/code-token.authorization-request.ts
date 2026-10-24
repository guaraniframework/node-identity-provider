import { PKCE } from '../../../pkces/pkce';
import { CodeTokenAuthorizationRequest } from '../../../requests/authorization/code-token/code-token.authorization-request';
import { AuthorizationContext } from '../authorization-context';

/**
 * Parameters of the Code & Token Authorization Context.
 */
export interface CodeTokenAuthorizationContext extends AuthorizationContext<CodeTokenAuthorizationRequest> {
  /**
   * Code Challenge provided by the Client.
   */
  readonly codeChallenge: string;

  /**
   * PKCE Code Challenge Method used to verify the Code Challenge.
   */
  readonly codeChallengeMethod: PKCE;
}
