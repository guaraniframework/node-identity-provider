import { URL } from 'url';

import { HttpResponse } from '../http/response/http-response';
import { DisplayName } from './display-name.type';

/**
 * Base class of a Display.
 */
export abstract class Display {
  /**
   * Name of the Display.
   */
  public abstract readonly name: DisplayName;

  /**
   * Creates an Http Response to the provided Redirect URI based on the provided Parameters.
   *
   * @param redirectUri Url to be redirected.
   * @param parameters Parameters used to build the Http Response.
   * @returns Http Response to the provided Redirect URI.
   */
  public abstract createHttpResponse<T extends NodeJS.Dict<unknown>>(redirectUri: URL, parameters: T): HttpResponse;
}
