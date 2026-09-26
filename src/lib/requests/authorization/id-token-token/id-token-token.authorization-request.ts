import { IdTokenAuthorizationRequest } from '../id-token/id-token.authorization-request';
import { TokenAuthorizationRequest } from '../token/token.authorization-request';

/**
 * Parameters of the ID Token Token Authorization Request.
 */
export interface IdTokenTokenAuthorizationRequest extends IdTokenAuthorizationRequest, TokenAuthorizationRequest {}
