import { IdTokenAuthorizationRequest } from '../../../requests/authorization/id-token/id-token.authorization-request';
import { AuthorizationContext } from '../authorization-context';

/**
 * Parameters of the ID Token Authorization Context.
 */
export interface IdTokenAuthorizationContext extends AuthorizationContext {
  /**
   * Parameters of the ID Token Authorization Request.
   */
  readonly parameters: IdTokenAuthorizationRequest;
}
