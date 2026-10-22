import { HttpRequestMethod } from '../request/http-request-method.enum';
import { HttpRouteHandler } from './http-route.handler';

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
  readonly handler: HttpRouteHandler;
}
