import { HttpRoute } from './http-route';

/**
 * Http Endpoint of the Identity Provider.
 */
export interface HttpEndpoint {
  /**
   * Path of the Http Endpoint.
   */
  readonly path: string;

  /**
   * Routes of the Http Endpoint.
   */
  readonly routes: HttpRoute[];
}
