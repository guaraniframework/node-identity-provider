import { CodeAuthorizationRequest } from '../code/code.authorization-request';
import { IdTokenAuthorizationRequest } from '../id-token/id-token.authorization-request';
import { TokenAuthorizationRequest } from '../token/token.authorization-request';

/**
 * Parameters of the Code ID Token Token Authorization Request.
 */
export interface CodeIdTokenTokenAuthorizationRequest
  extends CodeAuthorizationRequest, IdTokenAuthorizationRequest, TokenAuthorizationRequest {}
