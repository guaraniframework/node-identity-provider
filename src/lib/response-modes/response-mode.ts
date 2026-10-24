import { AuthorizationContext } from '../context/authorization/authorization-context';
import { HttpResponse } from '../http/response/http-response';
import { AuthorizationResponse } from '../responses/authorization/authorization-response';
import { ResponseModeName } from './response-mode-name.type';

/**
 * The Response Mode is used to populate the Http Response with the Parameters of the Authorization Response.
 */
export abstract class ResponseMode {
  /**
   * Name of the Response Mode.
   */
  public abstract readonly name: ResponseModeName;

  /**
   * Creates and returns an Http Response with the Parameters of the Authorization Response.
   *
   * @param context Authorization Context.
   * @param parameters Authorization Response Parameters that will be returned to the Client Application.
   * @returns Http Response with the Parameters of the Authorization Response.
   */
  public abstract createHttpResponse(
    context: AuthorizationContext,
    parameters: AuthorizationResponse,
  ): Promise<HttpResponse>;
}
