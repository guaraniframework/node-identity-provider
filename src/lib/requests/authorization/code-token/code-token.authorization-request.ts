import { CodeAuthorizationRequest } from '../code/code.authorization-request';
import { TokenAuthorizationRequest } from '../token/token.authorization-request';

/**
 * Parameters of the Code Token Authorization Request.
 */
export interface CodeTokenAuthorizationRequest extends CodeAuthorizationRequest, TokenAuthorizationRequest {}
