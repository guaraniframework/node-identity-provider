import { TokenContext } from '../context/token/token-context';
import { TokenResponse } from '../responses/token/token-response';
import { GrantTypeName } from './grant-type-name.type';

/**
 * The Grant Type is used to issue an Access Token to the Client.
 */
export abstract class GrantType {
  /**
   * Name of the Grant Type.
   */
  public abstract readonly name: GrantTypeName;

  /**
   * Creates the Token Response with the Access Token issued to the Client.
   *
   * @param context Token Context.
   * @returns Token Response.
   */
  public abstract handle(context: TokenContext): Promise<TokenResponse>;
}
