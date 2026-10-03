import { CodeAuthorizationResponse } from '../code/code.authorization-response';
import { IdTokenAuthorizationResponse } from '../id-token/id-token.authorization-response';

/**
 * Parameters of the Code ID Token Authorization Response.
 */
export interface CodeIdTokenAuthorizationResponse extends CodeAuthorizationResponse, IdTokenAuthorizationResponse {}
