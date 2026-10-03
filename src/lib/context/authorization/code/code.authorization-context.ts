import { Pkce } from '../../../pkce/pkce';
import { CodeAuthorizationRequest } from '../../../requests/authorization/code/code.authorization-request';
import { AuthorizationContext } from '../authorization-context';

/**
 * Parameters of the Code Authorization Context.
 */
export interface CodeAuthorizationContext extends AuthorizationContext {
  /**
   * Parameters of the Code Authorization Request.
   */
  readonly parameters: CodeAuthorizationRequest;

  /**
   * Code Challenge provided by the Client.
   */
  readonly codeChallenge: string;

  /**
   * PKCE Code Challenge Method used to verify the Code Challenge.
   */
  readonly codeChallengeMethod: Pkce;
}
