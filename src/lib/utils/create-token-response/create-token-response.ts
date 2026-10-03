import { AccessToken } from '../../entities/access-token';
import { TokenResponse } from '../../responses/token/token-response';

/**
 * Returns a formatted Token Response based on the provided Access Token.
 *
 * @param accessToken Access Token issued to the Client.
 * @returns Formatted Token Response.
 */
export function createTokenResponse<T extends TokenResponse = TokenResponse>(accessToken: AccessToken): T {
  return {
    access_token: accessToken.id,
    token_type: 'Bearer',
    expires_in: Math.ceil((accessToken.expiresAt.getTime() - Date.now()) / 1000),
    scope: accessToken.scopes.join(' '),
  } as T;
}
