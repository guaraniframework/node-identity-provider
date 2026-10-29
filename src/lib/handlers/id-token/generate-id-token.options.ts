import { AccessToken } from '../../entities/access-token';
import { AuthorizationCode } from '../../entities/authorization-code';

/**
 * Options for the Generate ID Token functionality.
 */
export interface GenerateIdTokenOptions {
  /**
   * Nonce provided by the Client.
   */
  readonly nonce?: string;

  /**
   * Max Age requested by the Client.
   */
  readonly maxAge?: number;

  /**
   * Access Token issued to the Client.
   */
  readonly accessToken?: AccessToken;

  /**
   * Authorization Code issued to the Client.
   */
  readonly authorizationCode?: AuthorizationCode;
}
