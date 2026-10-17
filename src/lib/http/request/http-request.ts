import { Buffer } from 'buffer';
import { IncomingHttpHeaders } from 'http';
import { parse as parseQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { hasEnumValue, isNonEmptyString, isPlainObject, jsonParse } from '@guarani/primitives';

import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { UnsupportedMediaTypeError } from '../../errors/unsupported-media-type/unsupported-media-type.error';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/tokens';
import { HttpRequestParameters } from './http-request.parameters';
import { HttpRequestMethod } from './http-request-method.enum';

/**
 * Abstraction of the Http Request.
 *
 * This abstraction is used to facilitate the integration of the Identity Provider
 * with the multiple Http Web Servers developed in NodeJS.
 */
export class HttpRequest {
  /**
   * Http Request Method.
   */
  public readonly method: HttpRequestMethod;

  /**
   * Http Request Path.
   */
  public readonly path: string;

  /**
   * Http Request Query Parameters.
   */
  public readonly query: NodeJS.Dict<string>;

  /**
   * Http Request Headers.
   */
  public readonly headers: IncomingHttpHeaders;

  /**
   * Http Request Cookies.
   */
  public readonly cookies: NodeJS.Dict<unknown>;

  /**
   * Http Request Body.
   */
  readonly #body: Buffer;

  /**
   * Logger of the Identity Provider.
   */
  readonly #logger: Logger;

  /**
   * Instantiates a new Http Request.
   *
   * @param parameters Http Request Parameters.
   * @throws {TypeError} The provided Http Request Parameters is invalid.
   * @throws {InvalidRequestError} The Http Request cannot have duplicate Parameters.
   */
  public constructor(parameters: HttpRequestParameters) {
    this.#logger = getContainer(CONTAINER).resolve(Logger);

    this.validateHttpRequestParameters(parameters);

    this.method = parameters.method;
    this.path = parameters.url.pathname;
    this.query = this.parseUrlEncodedData(parameters.url.search.substring(1));
    this.headers = parameters.headers;
    this.cookies = parameters.cookies;
    this.#body = parameters.body;
  }

  /**
   * Returns the Http Request Body if the Content-Type is **application/x-www-form-urlencoded**.
   *
   * @throws {UnsupportedMediaTypeError} The Content-Type of the Http Request Body is invalid.
   * @throws {InvalidRequestError} The Http Request cannot have duplicate Parameters.
   * @returns Http Request Body.
   */
  public form<T extends NodeJS.Dict<string>>(): T {
    this.#logger.debug(`[${this.constructor.name}] Called form()`, '06a8e02f-a8bb-4673-8673-3467ba66fdc1', null);

    this.expectContentType('application/x-www-form-urlencoded');
    const body = this.parseUrlEncodedData<T>(this.#body.toString('utf8'));

    this.#logger.debug(`[${this.constructor.name}] Completed form()`, 'd2e60e15-30d2-4744-87e5-2235255fff85', { body });

    return body;
  }

  /**
   * Returns the Http Request Body if the Content-Type is **application/json**.
   *
   * @throws {UnsupportedMediaTypeError} The Content-Type of the Http Request Body is invalid.
   * @returns Http Request Body.
   */
  public json<T extends NodeJS.Dict<unknown>>(): T {
    this.#logger.debug(`[${this.constructor.name}] Called json()`, 'f273feca-6e3b-4c9e-bd66-6605b52012f2', null);

    this.expectContentType('application/json');
    const body = this.parseJsonEncodedBody<T>();

    this.#logger.debug(`[${this.constructor.name}] Completed json()`, '868ec875-c6f9-4327-a9fb-0746fdb62df9', { body });

    return body;
  }

  /**
   * Validates the provided Http Request Parameters.
   *
   * @param parameters Http Request Parameters.
   * @throws {TypeError} The provided Http Request Parameters is invalid.
   */
  private validateHttpRequestParameters(parameters: HttpRequestParameters): void {
    this.#logger.debug(
      `[${this.constructor.name}] Called validateHttpRequestParameters()`,
      '11d9ae7a-45ea-49f1-9b30-dcaceb8da448',
      { parameters },
    );

    if (!isPlainObject(parameters)) {
      const error = new TypeError('The provided Http Request Parameters is invalid.');

      this.#logger.error(
        `[${this.constructor.name}] The provided Http Request Parameters is invalid`,
        '67da0429-8878-42dc-bdf3-366aa1b3498c',
        { parameters },
        error,
      );

      throw error;
    }

    if (!('method' in parameters) || !isNonEmptyString(parameters.method)) {
      const error = new TypeError('Invalid Http Request Method.');

      this.#logger.error(
        `[${this.constructor.name}] Invalid Http Request Method`,
        'e50215b7-52e5-48ae-acc6-db499998957b',
        { parameters },
        error,
      );

      throw error;
    }

    if (!hasEnumValue(HttpRequestMethod, parameters.method)) {
      const error = new TypeError(`Unsupported Http Request Method "${parameters.method}".`);

      this.#logger.error(
        `[${this.constructor.name}] Unsupported Http Request Method "${parameters.method}"`,
        '7ad7db5d-f71a-4d50-83b2-96bcd99f603d',
        { parameters },
        error,
      );

      throw error;
    }

    if (!('url' in parameters) || !(parameters.url instanceof URL)) {
      const error = new TypeError('Invalid Http Request URL.');

      this.#logger.error(
        `[${this.constructor.name}] Invalid Http Request URL`,
        '73ece9e1-0322-48c4-a8e7-63370b8469a5',
        { parameters },
        error,
      );

      throw error;
    }

    if (!('headers' in parameters) || !this._isValidHttpRequestHeaders(parameters.headers)) {
      const error = new TypeError('Invalid Http Request Headers.');

      this.#logger.error(
        `[${this.constructor.name}] Invalid Http Request Headers`,
        '2b3d162f-0cce-4898-a596-b86a13361c79',
        { parameters },
        error,
      );

      throw error;
    }

    if (!('cookies' in parameters) || !isPlainObject(parameters.cookies)) {
      const error = new TypeError('Invalid Http Request Cookies.');

      this.#logger.error(
        `[${this.constructor.name}] Invalid Http Request Cookies`,
        '1c2fad7b-b5cc-41d4-93a4-9c767e719e44',
        { parameters },
        error,
      );

      throw error;
    }

    if (!('body' in parameters) || !Buffer.isBuffer(parameters.body)) {
      const error = new TypeError('Invalid Http Request Body.');

      this.#logger.error(
        `[${this.constructor.name}] Invalid Http Request Body`,
        '41e02795-c3ef-447f-b5c4-09eb3102ad4c',
        { parameters },
        error,
      );

      throw error;
    }

    this.#logger.debug(
      `[${this.constructor.name}] Completed validateHttpRequestParameters()`,
      'ef12963b-bb06-46e7-b76c-1a25f43eab6b',
      { parameters },
    );
  }

  /**
   * Checks if the value of the Http Header **Content-Type** is the one expected by the application.
   *
   * @param contentType Expected Content Type.
   * @throws {UnsupportedMediaTypeError} The provided Content-Type is unsupported.
   */
  private expectContentType(contentType: string): void {
    this.#logger.debug(
      `[${this.constructor.name}] Called expectContentType()`,
      '89e5eb59-31dd-44db-9dd4-c8af62aa2578',
      { content_type: contentType },
    );

    if (this.headers['content-type'] !== contentType) {
      const error = new UnsupportedMediaTypeError(`Unexpected Content-Type "${this.headers['content-type']}".`, {
        fatal: true,
      });

      this.#logger.error(
        `[${this.constructor.name}] Unexpected Content-Type "${this.headers['content-type']}"`,
        '5467b458-527c-42ac-958f-02b20ccf732d',
        { content_type: contentType },
        error,
      );

      throw error;
    }

    this.#logger.debug(
      `[${this.constructor.name}] Completed expectContentType()`,
      '231ea014-ff50-4b2c-81d6-3752c7409262',
      { content_type: contentType },
    );
  }

  /**
   * Parses the provided URL Encoded Data into a simple object.
   *
   * @param data URL Encoded Data to be parsed.
   * @throws {InvalidRequestError} The Http Request cannot have duplicate Parameters.
   * @returns Parsed URL Encoded Data.
   */
  private parseUrlEncodedData<T extends NodeJS.Dict<string>>(data: string): T {
    this.#logger.debug(
      `[${this.constructor.name}] Called parseUrlEncodedData()`,
      '06405dd3-de68-4ab8-bef4-9555cb0d8593',
      { data },
    );

    const parsedData = parseQs(data);

    if (Object.values(parsedData).some(Array.isArray)) {
      const error = new InvalidRequestError('The Http Request cannot have duplicate Parameters.', { fatal: true });

      this.#logger.error(
        `[${this.constructor.name}] The Http Request cannot have duplicate Parameters`,
        '3c1a447c-7a57-47ee-bd27-b7c0c27f8252',
        { data, parsed_data: parsedData },
        error,
      );

      throw error;
    }

    this.#logger.debug(
      `[${this.constructor.name}] Completed parseUrlEncodedData()`,
      '8b22696c-935e-42bb-a158-98f296ad2634',
      { data, parsed_data: parsedData },
    );

    return parsedData as T;
  }

  /**
   * Parses the JSON Encoded Body into a simple object.
   *
   * @param data JSON Encoded Data to be parsed.
   * @throws {InvalidRequestError} The provided Http Request Body is invalid.
   * @returns Parsed JSON Encoded Data.
   */
  private parseJsonEncodedBody<T extends NodeJS.Dict<unknown>>(): T {
    const data = this.#body.toString('utf8');

    this.#logger.debug(
      `[${this.constructor.name}] Called parseJsonEncodedBody()`,
      '29fd0166-8f06-4cf2-aea0-eb3a935cbd27',
      { data },
    );

    try {
      const parsedData = jsonParse(data);

      this.#logger.debug(
        `[${this.constructor.name}] Completed parseJsonEncodedBody()`,
        'f82ae038-8df4-44f9-a69d-ffb5b7617702',
        { data, parsed_data: parsedData },
      );

      return parsedData;
    } catch (err: unknown) {
      const error = new InvalidRequestError('The provided Http Request Body is invalid.', { cause: err, fatal: true });

      this.#logger.error(
        `[${this.constructor.name}] The provided Http Request Body is invalid`,
        '38e50163-4812-45e5-bfe0-76a0a0a404e9',
        { data },
        error,
      );

      throw error;
    }
  }

  private _isValidHttpRequestHeaders(headers: IncomingHttpHeaders): boolean {
    return (
      isPlainObject(headers) &&
      Object.values(headers).every((header) => {
        return (
          isNonEmptyString(header) || (Array.isArray(header) && header.length !== 0 && header.every(isNonEmptyString))
        );
      })
    );
  }
}
