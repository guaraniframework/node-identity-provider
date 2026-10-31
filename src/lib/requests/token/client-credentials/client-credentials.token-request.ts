import { TokenRequest } from '../token-request';

/**
 * Parameters of the Client Credentials Token Request.
 */
export interface ClientCredentialsTokenRequest extends TokenRequest<'client_credentials'> {
  /**
   * Scope requested by the Client.
   */
  readonly scope?: string;
}
