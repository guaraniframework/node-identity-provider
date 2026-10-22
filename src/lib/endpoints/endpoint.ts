import { HttpRoute } from '../http/route/http-route';
import { EndpointName } from './endpoint-name.type';

/**
 * The Endpoint class contains the code for the Handlers of an Identity Provider Endpoint.
 *
 * A Handler is a method that takes in an Http Request, uses its contents to satisfy a business rule,
 * and returns an Http Response containing the data to be returned to the Client of the Request.
 *
 * The Endpoint defines a Path that will be used to route a Request from a Web Server into one of its Routes.
 *
 * The Endpoint also defines a collection of Http Routes, where each Route contains an Http Request Method
 * and an Http Handler, which is used to handle the Http Request based on its respective business rule.
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
   * Http Routes of the Endpoint.
   */
  public abstract readonly routes: HttpRoute[];
}
