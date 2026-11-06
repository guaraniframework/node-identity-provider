import { AccessToken } from '../../entities/access-token';
import { Client } from '../../entities/client';
import { RefreshToken } from '../../entities/refresh-token';
import { RevocationRequest } from '../../requests/revocation/revocation-request';

/**
 * Parameters of the Revocation Context.
 */
export interface RevocationContext {
  /**
   * Parameters of the Revocation Request.
   */
  readonly parameters: RevocationRequest;

  /**
   * Client of the Revocation Request.
   */
  readonly client: Client;

  /**
   * Token provided by the Client.
   */
  readonly token: AccessToken | RefreshToken | null;
}
