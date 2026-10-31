import { URL } from 'url';

import { AuthorizationCode } from '../../../entities/authorization-code';
import { AuthorizationCodeTokenRequest } from '../../../requests/token/authorization-code/authorization-code.token-request';
import { TokenContext } from '../token-context';

/**
 * Parameters of the Authorization Code Token Context.
 */
export interface AuthorizationCodeTokenContext extends TokenContext<AuthorizationCodeTokenRequest> {
  /**
   * Authorization Code provided by the Client.
   */
  readonly authorizationCode: AuthorizationCode;

  /**
   * Redirect URI provided by the Client.
   */
  readonly redirectUri: URL;

  /**
   * Code Verifier provided by the Client.
   */
  readonly codeVerifier: string;
}
