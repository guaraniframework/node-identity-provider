import { AuthorizationContext } from '../context/authorization/authorization-context';
import { ResponseModeName } from '../response-modes/response-mode-name.type';
import { AuthorizationResponse } from '../responses/authorization/authorization-response';
import { ResponseTypeName } from './response-type-name.type';

/**
 * The Response Type is used to issue an Authorization Grant to the Client on behalf of the User.
 */
export abstract class ResponseType {
  /**
   * Name of the Response Type.
   */
  public abstract readonly name: ResponseTypeName;

  /**
   * Default Response Mode of the Response Type.
   */
  public abstract readonly defaultResponseMode: ResponseModeName;

  /**
   * Creates the Authorization Response with the Authorization Grant issued to the Client on behalf of the User.
   *
   * @param context Authorization Context.
   * @returns Authorization Response.
   */
  public abstract handle(context: AuthorizationContext): Promise<AuthorizationResponse>;
}
