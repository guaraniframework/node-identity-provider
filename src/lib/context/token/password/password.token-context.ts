import { Scope } from '../../../entities/scope';
import { User } from '../../../entities/user';
import { PasswordTokenRequest } from '../../../requests/token/password/password.token-request';
import { TokenContext } from '../token-context';

/**
 * Parameters of the Resource Owner Password Credentials Token Context.
 */
export interface PasswordTokenContext extends TokenContext<PasswordTokenRequest> {
  /**
   * User represented by the Resource Owner Credentials provided by the Client.
   */
  readonly user: User;

  /**
   * Scopes requested by the Client.
   */
  readonly scopes: Scope[];
}
