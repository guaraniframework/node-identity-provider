import { Buffer } from 'buffer';
import { IncomingHttpHeaders } from 'http';
import qs, { ParsedUrlQuery } from 'querystring';
import { URL } from 'url';

import { hasEnumValue, isNonEmptyString, isPlainObject, jsonParse } from '@guarani/primitives';

import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { UnsupportedMediaTypeError } from '../../errors/unsupported-media-type/unsupported-media-type.error';
import { HttpRequestParameters } from './http-request.parameters';
import { HttpRequestMethod } from './http-request-method.enum';

/**
 * Abstraction of the Http Request.
 *
 * This abstraction is used to facilitate the integration of the Identity Provider
 * with the multiple Web Servers developed in NodeJS.
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
  public readonly query: ParsedUrlQuery;

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
   * Instantiates a new Http Request.
   *
   * @param parameters Http Request Parameters.
   * @throws {TypeError} The provided Http Request Parameters is invalid.
   */
  public constructor(parameters: HttpRequestParameters) {
    this.validateHttpRequestParameters(parameters);

    this.method = parameters.method;
    this.path = parameters.url.pathname;
    this.query = qs.parse(parameters.url.search.substring(1));
    this.headers = parameters.headers;
    this.cookies = parameters.cookies;
    this.#body = parameters.body;
  }

  /**
   * Returns the Http Request Body if the Content-Type is application/x-www-form-urlencoded.
   *
   * @throws {UnsupportedMediaTypeError} The Content-Type of the Http Request Body is invalid.
   * @returns Http Request Body.
   */
  public form<T extends NodeJS.Dict<string | string[]>>(): T {
    this.expectContentType('application/x-www-form-urlencoded');
    return qs.parse(this.#body.toString('utf8')) as T;
  }

  /**
   * Returns the Http Request Body if the Content-Type is application/json.
   *
   * @throws {InvalidRequestError} The provided Http Request Body is invalid.
   * @throws {UnsupportedMediaTypeError} The Content-Type of the Http Request Body is invalid.
   * @returns Http Request Body.
   */
  public json<T extends NodeJS.Dict<unknown>>(): T {
    this.expectContentType('application/json');
    return this.parseJsonEncodedBody<T>();
  }

  /**
   * Validates the provided Http Request Parameters.
   *
   * @param parameters Http Request Parameters.
   * @throws {TypeError} The provided Http Request Parameters is invalid.
   */
  private validateHttpRequestParameters(parameters: HttpRequestParameters): void {
    if (!isPlainObject(parameters)) {
      throw new TypeError('The provided Http Request Parameters is invalid.');
    }

    if (!('method' in parameters) || !isNonEmptyString(parameters.method)) {
      throw new TypeError('Invalid Http Request Method.');
    }

    if (!hasEnumValue(HttpRequestMethod, parameters.method)) {
      throw new TypeError(`Unsupported Http Request Method "${parameters.method}".`);
    }

    if (!('url' in parameters) || !(parameters.url instanceof URL)) {
      throw new TypeError('Invalid Http Request URL.');
    }

    if (!('headers' in parameters) || !this._isValidHttpRequestHeaders(parameters.headers)) {
      throw new TypeError('Invalid Http Request Headers.');
    }

    if (!('cookies' in parameters) || !isPlainObject(parameters.cookies)) {
      throw new TypeError('Invalid Http Request Cookies.');
    }

    if (!('body' in parameters) || !Buffer.isBuffer(parameters.body)) {
      throw new TypeError('Invalid Http Request Body.');
    }
  }

  /**
   * Checks if the value of the Http Header Content-Type is the one expected by the application.
   *
   * @param contentType Expected Content Type.
   * @throws {UnsupportedMediaTypeError} The provided Content-Type is unsupported.
   */
  private expectContentType(contentType: string): void {
    if (this.headers['content-type'] !== contentType) {
      throw new UnsupportedMediaTypeError(`Unexpected Content-Type "${this.headers['content-type']}".`, {
        fatal: true,
      });
    }
  }

  /**
   * Parses the JSON Encoded Body into a simple object.
   *
   * @param data JSON Encoded Data to be parsed.
   * @throws {InvalidRequestError} The provided Http Request Body is invalid.
   * @returns Parsed JSON Encoded Data.
   */
  private parseJsonEncodedBody<T extends NodeJS.Dict<unknown>>(): T {
    try {
      return jsonParse(this.#body.toString('utf8'));
    } catch (err: unknown) {
      throw new InvalidRequestError('The provided Http Request Body is invalid.', { cause: err, fatal: true });
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
