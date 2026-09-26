import { IdTokenAuthorizationResponse } from '../id-token/id-token.authorization-response';
import { TokenAuthorizationResponse } from '../token/token.authorization-response';

/**
 * Parameters of the ID Token Token Authorization Response.
 */
export interface IdTokenTokenAuthorizationResponse extends IdTokenAuthorizationResponse, TokenAuthorizationResponse {}
