import { AuthorizationContext } from '../context/authorization/authorization-context';
import { HttpResponse } from '../http/response/http-response';
import { AuthorizationResponse } from '../responses/authorization/authorization-response';
import { ResponseModeName } from './response-mode-name.type';

/**
 * Base class of a Response Mode.
 */
export abstract class ResponseMode {
  /**
   * Name of the Response Mode.
   */
  public abstract readonly name: ResponseModeName;

  /**
   * Creates and returns an Http Response containing the Parameters of the Authorization Response.
   *
   * @param context Context of the Authorization Request.
   * @param parameters Authorization Response Parameters that will be returned to the Client Application.
   * @returns Http Response containing the Authorization Response Parameters.
   */
  public abstract createHttpResponse(
    context: AuthorizationContext,
    parameters: AuthorizationResponse,
  ): Promise<HttpResponse>;
}
