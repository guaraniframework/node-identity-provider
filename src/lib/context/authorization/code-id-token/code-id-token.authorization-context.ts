import { CodeIdTokenAuthorizationRequest } from '../../../requests/authorization/code-id-token/code-id-token.authorization-request';
import { CodeAuthorizationContext } from '../code/code.authorization-context';
import { IdTokenAuthorizationContext } from '../id-token/id-token.authorization-context';

/**
 * Parameters of the Code ID Token Authorization Context.
 */
export interface CodeIdTokenAuthorizationContext extends CodeAuthorizationContext, IdTokenAuthorizationContext {
  /**
   * Parameters of the Code ID Token Authorization Request.
   */
  readonly parameters: CodeIdTokenAuthorizationRequest;
}
