import { PKCE } from '../../../pkces/pkce';
import { CodeIdTokenTokenAuthorizationRequest } from '../../../requests/authorization/code-id-token-token/code-id-token-token.authorization-request';
import { AuthorizationContext } from '../authorization-context';

/**
 * Parameters of the Code & ID Token & Token Authorization Context.
 */
export interface CodeIdTokenTokenAuthorizationContext extends AuthorizationContext<CodeIdTokenTokenAuthorizationRequest> {
  /**
   * Code Challenge provided by the Client.
   */
  readonly codeChallenge: string;

  /**
   * PKCE Code Challenge Method used to verify the Code Challenge.
   */
  readonly codeChallengeMethod: PKCE;
}
