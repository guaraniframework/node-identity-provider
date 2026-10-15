import { HttpRequestMethod } from '../request/http-request-method.enum';
import { HttpHandler } from './http-handler.type';

/**
 * Http Route of the Identity Provider.
 */
export interface HttpRoute {
  /**
   * Http Request Method of the Route.
   */
  readonly method: HttpRequestMethod;

  /**
   * Handler of the Route.
   */
  readonly handler: HttpHandler;
}
