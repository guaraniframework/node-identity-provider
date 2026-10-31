import { Client } from '../../entities/client';
import { GrantType } from '../../grant-types/grant-type';
import { TokenRequest } from '../../requests/token/token-request';

/**
 * Parameters of the Token Context.
 */
export interface TokenContext<TRequest extends TokenRequest = TokenRequest> {
  /**
   * Parameters of the Token Request.
   */
  readonly parameters: TRequest;

  /**
   * Grant Type requested by the Client.
   */
  readonly grantType: GrantType;

  /**
   * Client of the Token Request.
   */
  readonly client: Client;
}
