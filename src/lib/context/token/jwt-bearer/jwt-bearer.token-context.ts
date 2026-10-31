import { Scope } from '../../../entities/scope';
import { User } from '../../../entities/user';
import { JwtBearerTokenRequest } from '../../../requests/token/jwt-bearer/jwt-bearer.token-request';
import { TokenContext } from '../token-context';

/**
 * Parameters of the JWT Bearer Token Context.
 */
export interface JwtBearerTokenContext extends TokenContext<JwtBearerTokenRequest> {
  /**
   * User represented by the JSON Web Token Assertion.
   */
  readonly user: User;

  /**
   * Scopes requested by the Client.
   */
  readonly scopes: Scope[];
}
