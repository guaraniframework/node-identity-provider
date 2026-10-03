import { CodeIdTokenTokenAuthorizationRequest } from '../../../requests/authorization/code-id-token-token/code-id-token-token.authorization-request';
import { CodeAuthorizationContext } from '../code/code.authorization-context';
import { IdTokenAuthorizationContext } from '../id-token/id-token.authorization-context';
import { TokenAuthorizationContext } from '../token/token.authorization-context';

/**
 * Parameters of the Code ID Token Token Authorization Context.
 */
export interface CodeIdTokenTokenAuthorizationContext
  extends CodeAuthorizationContext, IdTokenAuthorizationContext, TokenAuthorizationContext {
  /**
   * Parameters of the Code ID Token Token Authorization Request.
   */
  readonly parameters: CodeIdTokenTokenAuthorizationRequest;
}
