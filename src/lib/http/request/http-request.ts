import { Buffer } from 'buffer';
import { IncomingHttpHeaders } from 'http';
import { parse as parseQs } from 'querystring';

import { getContainer } from '@guarani/di';
import { isNonEmptyString, isPlainObject, jsonParse } from '@guarani/primitives';

import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { UnsupportedMediaTypeError } from '../../errors/unsupported-media-type/unsupported-media-type.error';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { HttpRequestParameters } from './http-request.parameters';
import { HttpRequestMethod } from './http-request-method.type';

/**
 * Abstraction of the Http Request.
 *
 * This abstraction is used to facilitate the integration of the Identity Provider Framework
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
    if (!isPlainObject(parameters)) {
      throw new TypeError('The provided Http Request Parameters is invalid.');
    }

    this.#logger = getContainer(CONTAINER).resolve(Logger);

    this.checkMethod(parameters.method);

    this.method = parameters.method;
    this.path = parameters.url.pathname;
    this.query = this.parseUrlEncodedData(parameters.url.search.substring(1));
    this.headers = parameters.headers;
    this.cookies = parameters.cookies;
    this.#body = parameters.body;
  }

  /**
   * Returns the Http Request Body if the Content-Type is application/x-www-form-urlencoded.
   *
   * @throws {UnsupportedMediaTypeError} The Content-Type of the Http Request Body is invalid.
   * @throws {InvalidRequestError} The Http Request cannot have duplicate Parameters.
   * @returns Http Request Body.
   */
  public form<T extends NodeJS.Dict<string>>(): T {
    this.#logger.debug(`[${this.constructor.name}] Called form()`, '06a8e02f-a8bb-4673-8673-3467ba66fdc1');

    this.expectContentType('application/x-www-form-urlencoded');
    const body = this.parseUrlEncodedData<T>(this.#body.toString('utf8'));

    this.#logger.debug(`[${this.constructor.name}] Completed form()`, 'd2e60e15-30d2-4744-87e5-2235255fff85', { body });

    return body;
  }

  /**
   * Returns the Http Request Body if the Content-Type is application/json.
   *
   * @throws {UnsupportedMediaTypeError} The Content-Type of the Http Request Body is invalid.
   * @returns Http Request Body.
   */
  public json<T extends NodeJS.Dict<unknown>>(): T {
    this.#logger.debug(`[${this.constructor.name}] Called json()`, 'f273feca-6e3b-4c9e-bd66-6605b52012f2');

    this.expectContentType('application/json');
    const body = this.parseJsonEncodedBody();

    this.#logger.debug(`[${this.constructor.name}] Completed json()`, '868ec875-c6f9-4327-a9fb-0746fdb62df9', { body });

    return body as T;
  }

  /**
   * Checks if the Http Method provided by the application is valid.
   *
   * @param method Http Method provided by the application.
   * @throws {TypeError} Invalid or Unsupported Http Method.
   */
  private checkMethod(method: HttpRequestMethod): void {
    this.#logger.debug(`[${this.constructor.name}] Called checkMethod()`, '2ae0ab91-8c1c-45d8-8a27-b0ae927b05b3', {
      method,
    });

    if (!isNonEmptyString(method)) {
      const error = new TypeError('Invalid Http Request Method.');

      this.#logger.error(
        `[${this.constructor.name}] Invalid Http Request Method`,
        'e50215b7-52e5-48ae-acc6-db499998957b',
        { method },
        error,
      );

      throw error;
    }

    switch (method) {
      case 'DELETE':
      case 'GET':
      case 'POST':
      case 'PUT':
        this.#logger.debug(
          `[${this.constructor.name}] Completed checkMethod()`,
          '94c0a51d-27fd-40cf-a653-5c961af52854',
          { method },
        );

        return;

      default: {
        const error = new TypeError(`Unsupported Http Request Method "${method}".`);

        this.#logger.error(
          `[${this.constructor.name}] Unsupported Http Request Method "${method}"`,
          '7ad7db5d-f71a-4d50-83b2-96bcd99f603d',
          { method },
          error,
        );

        throw error;
      }
    }
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
      const error = new UnsupportedMediaTypeError(`Unexpected Content-Type "${this.headers['content-type']}".`);

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
      const error = new InvalidRequestError('The Http Request cannot have duplicate Parameters.');

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
  private parseJsonEncodedBody(): NodeJS.Dict<unknown> {
    const body = this.#body.toString('utf8');

    this.#logger.debug(
      `[${this.constructor.name}] Called parseJsonEncodedBody()`,
      '29fd0166-8f06-4cf2-aea0-eb3a935cbd27',
      { body },
    );

    try {
      const parsedBody = jsonParse(body);

      this.#logger.debug(
        `[${this.constructor.name}] Completed parseJsonEncodedBody()`,
        'f82ae038-8df4-44f9-a69d-ffb5b7617702',
        { body, parsed_body: parsedBody },
      );

      return parsedBody;
    } catch (err: unknown) {
      const error = new InvalidRequestError('The provided Http Request Body is invalid.', { cause: err });

      this.#logger.error(
        `[${this.constructor.name}] The provided Http Request Body is invalid`,
        '38e50163-4812-45e5-bfe0-76a0a0a404e9',
        { body },
        error,
      );

      throw error;
    }
  }
}
