import { Buffer } from 'buffer';
import { IncomingHttpHeaders } from 'http';
import { URL } from 'url';

import { HttpRequestMethod } from './http-request-method.type';

/**
 * Parameters of the Http Request.
 */
export interface HttpRequestParameters {
  /**
   * Method of the Http Request.
   */
  readonly method: HttpRequestMethod;

  /**
   * Url of the Http Request.
   */
  readonly url: URL;

  /**
   * Headers of the Http Request.
   */
  readonly headers: IncomingHttpHeaders;

  /**
   * Cookies of the Http Request.
   */
  readonly cookies: NodeJS.Dict<unknown>;

  /**
   * Body of the Http Request.
   */
  readonly body: Buffer;
}
