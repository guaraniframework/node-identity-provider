import { IdTokenTokenAuthorizationRequest } from '../../../requests/authorization/id-token-token/id-token-token.authorization-request';
import { AuthorizationContext } from '../authorization-context';

/**
 * Parameters of the ID Token & Token Authorization Context.
 */
export interface IdTokenTokenAuthorizationContext extends AuthorizationContext<IdTokenTokenAuthorizationRequest> {}
