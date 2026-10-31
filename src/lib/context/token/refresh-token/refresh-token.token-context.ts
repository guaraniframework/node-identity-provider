import { RefreshToken } from '../../../entities/refresh-token';
import { Scope } from '../../../entities/scope';
import { RefreshTokenTokenRequest } from '../../../requests/token/refresh-token/refresh-token.token-request';
import { TokenContext } from '../token-context';

/**
 * Parameters of the Refresh Token Token Context.
 */
export interface RefreshTokenTokenContext extends TokenContext<RefreshTokenTokenRequest> {
  /**
   * Refresh Token provided by the Client.
   */
  readonly refreshToken: RefreshToken;

  /**
   * Scopes granted to the Client's new Access Token.
   */
  readonly scopes: Scope[];
}
