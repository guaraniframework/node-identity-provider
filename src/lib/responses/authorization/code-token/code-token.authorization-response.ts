import { CodeAuthorizationResponse } from '../code/code.authorization-response';
import { TokenAuthorizationResponse } from '../token/token.authorization-response';

/**
 * Parameters of the Code Token Authorization Response.
 */
export interface CodeTokenAuthorizationResponse extends CodeAuthorizationResponse, TokenAuthorizationResponse {}
