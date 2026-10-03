import { AuthorizationContext } from '../context/authorization/authorization-context';
import { ResponseModeName } from '../response-modes/response-mode-name.type';
import { AuthorizationResponse } from '../responses/authorization/authorization-response';
import { ResponseTypeName } from './response-type-name.type';

/**
 * Base class of a Response Type.
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
   * Creates the Authorization Response with the Authorization Grant used by the Client on behalf of the User.
   *
   * @param context Authorization Request Context.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns Authorization Response.
   */
  public abstract handle(context: AuthorizationContext): Promise<AuthorizationResponse>;
}
