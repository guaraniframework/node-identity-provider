import { CodeTokenAuthorizationRequest } from '../../../requests/authorization/code-token/code-token.authorization-request';
import { CodeAuthorizationContext } from '../code/code.authorization-context';
import { TokenAuthorizationContext } from '../token/token.authorization-context';

/**
 * Parameters of the Code Token Authorization Context.
 */
export interface CodeTokenAuthorizationContext extends CodeAuthorizationContext, TokenAuthorizationContext {
  /**
   * Parameters of the Code Token Authorization Request.
   */
  readonly parameters: CodeTokenAuthorizationRequest;
}
