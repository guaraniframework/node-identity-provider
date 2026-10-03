import { CodeAuthorizationRequest } from '../code/code.authorization-request';
import { IdTokenAuthorizationRequest } from '../id-token/id-token.authorization-request';

/**
 * Parameters of the Code ID Token Authorization Request.
 */
export interface CodeIdTokenAuthorizationRequest extends CodeAuthorizationRequest, IdTokenAuthorizationRequest {}
