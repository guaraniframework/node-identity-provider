import { HttpRequest } from '../http/request/http-request';
import { HttpRequestMethod } from '../http/request/http-request-method.type';
import { HttpResponse } from '../http/response/http-response';
import { EndpointName } from './endpoint-name.type';

/**
 * Base class for an Identity Provider Endpoint.
 */
export abstract class Endpoint {
  /**
   * Name of the Endpoint.
   */
  public abstract readonly name: EndpointName;

  /**
   * Path of the Endpoint.
   */
  public abstract readonly path: string;

  /**
   * Http Methods supported by the Endpoint.
   */
  public abstract readonly httpMethods: HttpRequestMethod[];

  /**
   * All Endpoints are required to implement this method, since it must return an Http Response back to the Client.
   *
   * The Type, Status, Headers and Body of the Http Response it returns, as well as its meaning and formatting,
   * have to be documented by the respective implementation.
   *
   * This method must not throw any error.
   *
   * If an error occurs during the processing of the Http Request, it must be treated, and its appropriate Status,
   * Headers and Body must be correctly set to denote the type of error that occured.
   *
   * @param request Http Request.
   * @returns Http Response.
   */
  public abstract handle(request: HttpRequest): Promise<HttpResponse>;
}
