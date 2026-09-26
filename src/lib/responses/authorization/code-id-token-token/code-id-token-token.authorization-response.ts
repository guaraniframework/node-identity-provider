import { CodeAuthorizationResponse } from '../code/code.authorization-response';
import { IdTokenAuthorizationResponse } from '../id-token/id-token.authorization-response';
import { TokenAuthorizationResponse } from '../token/token.authorization-response';

/**
 * Parameters of the Code ID Token Token Authorization Response.
 */
export interface CodeIdTokenTokenAuthorizationResponse
  extends CodeAuthorizationResponse, IdTokenAuthorizationResponse, TokenAuthorizationResponse {}
