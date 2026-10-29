import { AuthorizationRequest } from '../authorization-request';

/**
 * Parameters of the ID Token & Token Authorization Request.
 */
export interface IdTokenTokenAuthorizationRequest extends AuthorizationRequest<'id_token token'> {}
