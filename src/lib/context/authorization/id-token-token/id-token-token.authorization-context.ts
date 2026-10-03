import { IdTokenTokenAuthorizationRequest } from '../../../requests/authorization/id-token-token/id-token-token.authorization-request';
import { IdTokenAuthorizationContext } from '../id-token/id-token.authorization-context';
import { TokenAuthorizationContext } from '../token/token.authorization-context';

/**
 * Parameters of the ID Token Token Authorization Context.
 */
export interface IdTokenTokenAuthorizationContext extends IdTokenAuthorizationContext, TokenAuthorizationContext {
  /**
   * Parameters of the ID Token Token Authorization Request.
   */
  readonly parameters: IdTokenTokenAuthorizationRequest;
}
