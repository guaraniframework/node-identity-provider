import { AccessToken } from '../../entities/access-token';
import { Client } from '../../entities/client';
import { RefreshToken } from '../../entities/refresh-token';
import { IntrospectionRequest } from '../../requests/introspection/introspection-request';

/**
 * Parameters of the Introspection Context.
 */
export interface IntrospectionContext {
  /**
   * Parameters of the Introspection Request.
   */
  readonly parameters: IntrospectionRequest;

  /**
   * Client of the Introspection Request.
   */
  readonly client: Client;

  /**
   * Token provided by the Client.
   */
  readonly token: AccessToken | RefreshToken | null;
}
