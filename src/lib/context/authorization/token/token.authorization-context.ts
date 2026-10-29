import { TokenAuthorizationRequest } from '../../../requests/authorization/token/token.authorization-request';
import { AuthorizationContext } from '../authorization-context';

/**
 * Parameters of the Token Authorization Context.
 */
export interface TokenAuthorizationContext extends AuthorizationContext<TokenAuthorizationRequest> {}
