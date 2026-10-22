import { Buffer } from 'buffer';
import { IncomingHttpHeaders } from 'http';
import { URL } from 'url';

import { HttpRequestMethod } from './http-request-method.enum';

/**
 * Parameters of the Http Request.
 */
export interface HttpRequestParameters {
  /**
   * Http Request Method.
   */
  readonly method: HttpRequestMethod;

  /**
   * Http Request Url.
   */
  readonly url: URL;

  /**
   * Http Request Headers.
   */
  readonly headers: IncomingHttpHeaders;

  /**
   * Http Request Cookies.
   */
  readonly cookies: NodeJS.Dict<unknown>;

  /**
   * Http Request Body.
   */
  readonly body: Buffer;
}
