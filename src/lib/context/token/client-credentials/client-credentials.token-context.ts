import { Scope } from '../../../entities/scope';
import { ClientCredentialsTokenRequest } from '../../../requests/token/client-credentials/client-credentials.token-request';
import { TokenContext } from '../token-context';

/**
 * Parameters of the Client Credentials Token Context.
 */
export interface ClientCredentialsTokenContext extends TokenContext<ClientCredentialsTokenRequest> {
  /**
   * Scopes requested by the Client.
   */
  readonly scopes: Scope[];
}
