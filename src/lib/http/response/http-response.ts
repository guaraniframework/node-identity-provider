import { Buffer } from 'buffer';
import { OutgoingHttpHeader, OutgoingHttpHeaders } from 'http';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { isNonEmptyString, isPlainObject, jsonStringify } from '@guarani/primitives';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';

/**
 * Abstraction of the Http Response.
 *
 * This abstraction is used to facilitate the integration of the Identity Provider Framework
 * with the multiple Http Web Servers developed in NodeJS.
 */
export class HttpResponse {
  /**
   * Http Response Status Code.
   */
  #status = 200;

  /**
   * Http Response Headers.
   */
  #headers: OutgoingHttpHeaders = {};

  /**
   * Http Response Cookies.
   */
  #cookies: NodeJS.Dict<unknown> = {};

  /**
   * Http Response Encoded Body.
   */
  #body: Buffer = Buffer.alloc(0);

  /**
   * Logger of the Identity Provider.
   */
  readonly #logger: Logger;

  /**
   * Http Response Status Code.
   */
  public get status(): number {
    return this.#status;
  }

  /**
   * Http Response Headers.
   */
  public get headers(): OutgoingHttpHeaders {
    return this.#headers;
  }

  /**
   * Http Response Cookies.
   */
  public get cookies(): NodeJS.Dict<unknown> {
    return this.#cookies;
  }

  /**
   * Http Response Encoded Body.
   */
  public get body(): Buffer {
    return this.#body;
  }

  /**
   * Instantiates a new Http Response.
   */
  public constructor() {
    this.#logger = getContainer(CONTAINER).resolve(Logger);

    this.isValidJsonData = this.isValidJsonData.bind(this);
  }

  /**
   * Defines the Status Code of the Http Response.
   *
   * @param status Status Code of the Http Response.
   * @throws {TypeError} The provided Http Status is invalid.
   * @returns Http Response.
   */
  public setStatus(status: number): HttpResponse {
    this.#logger.debug(`[${this.constructor.name}] Called setStatus()`, '165c7adb-89ae-47c0-98b3-29db9d410fc6', {
      status,
    });

    if (typeof status !== 'number' || !Number.isSafeInteger(status) || status <= 0) {
      const error = new TypeError('The provided Http Status is invalid.');

      this.#logger.error(
        `[${this.constructor.name}] The provided Http Status is invalid`,
        'b5e98f84-21a9-465f-b8b1-df4882839505',
        { status },
        error,
      );

      throw error;
    }

    this.#status = status;

    this.#logger.debug(`[${this.constructor.name}] Completed setStatus()`, '5ec5af0a-91b0-4990-b77a-58fb09b28b03', {
      status,
    });

    return this;
  }

  /**
   * Defines a Header of the Http Response.
   *
   * @param header Name of the Http Response Header.
   * @param value Value of the Http Response Header.
   * @throws {TypeError} One of the provided arguments is invalid.
   * @returns Http Response.
   */
  public setHeader(header: string, value: OutgoingHttpHeader): HttpResponse {
    this.#logger.debug(`[${this.constructor.name}] Called setHeader()`, 'cb296702-a660-489e-89a3-5fb823ff4624', {
      header,
      value,
    });

    if (!isNonEmptyString(header)) {
      const error = new TypeError('The provided Http Header Name is invalid.');

      this.#logger.error(
        `[${this.constructor.name}] The provided Http Header Name is invalid`,
        'e2bfa470-f1f3-42b6-8dd3-d947cc9f550c',
        { header, value },
        error,
      );

      throw error;
    }

    if (
      !isNonEmptyString(value) &&
      (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) &&
      (!Array.isArray(value) || value.length === 0 || value.some((element) => !isNonEmptyString(element)))
    ) {
      const error = new TypeError('The provided Http Header Value is invalid.');

      this.#logger.error(
        `[${this.constructor.name}] The provided Http Header Value is invalid`,
        '1105c9ef-9c6d-4362-9e15-f6d842a72071',
        { header, value },
        error,
      );

      throw error;
    }

    this.#headers[header] = value;

    this.#logger.debug(`[${this.constructor.name}] Completed setHeader()`, '570b9600-d86f-485f-957c-334d845e73a6', {
      header,
      value,
    });

    return this;
  }

  /**
   * Defines multiple Headers of the Http Response.
   *
   * @param headers Http Response Headers.
   * @throws {TypeError} The provided Http Headers is invalid.
   * @returns Http Response.
   */
  public setHeaders(headers: OutgoingHttpHeaders): HttpResponse {
    this.#logger.debug(`[${this.constructor.name}] Called setHeaders()`, '130037ac-ec69-4cbe-aafd-9c70c1d4bf3e', {
      headers,
    });

    if (!isPlainObject(headers)) {
      const error = new TypeError('The provided Http Headers is invalid.');

      this.#logger.error(
        `[${this.constructor.name}] The provided Http Headers is invalid`,
        '801bbc51-6520-4e57-a970-076eeecd95f9',
        { headers },
        error,
      );

      throw error;
    }

    Object.entries(headers).forEach(([header, value]) => this.setHeader(header, value!));

    this.#logger.debug(`[${this.constructor.name}] Completed setHeaders()`, '29e02d1d-abfa-4375-bc92-4099f48cd079', {
      headers,
    });

    return this;
  }

  /**
   * Defines a Cookie of the Http Response.
   *
   * @param cookie Name of the Http Response Cookie.
   * @param value Value of the Http Response Cookie.
   * @throws {TypeError} The provided Http Cookie is invalid.
   * @returns Http Response.
   */
  public setCookie(cookie: string, value: unknown): HttpResponse {
    this.#logger.debug(`[${this.constructor.name}] Called setCookie()`, 'adeab246-14ea-43a2-84be-6e245266c1da', {
      cookie,
      value,
    });

    if (!isNonEmptyString(cookie)) {
      const error = new TypeError('The provided Http Cookie Name is invalid.');

      this.#logger.error(
        `[${this.constructor.name}] The provided Http Cookie Name is invalid`,
        '27ec17db-b9b3-42d7-b03f-eeb2e2167367',
        { cookie, value },
        error,
      );

      throw error;
    }

    this.#cookies[cookie] = value;

    this.#logger.debug(`[${this.constructor.name}] Completed setCookie()`, 'e1f62343-1c05-47fe-a20b-d1c3cda80f9e', {
      cookie,
      value,
    });

    return this;
  }

  /**
   * Defines multiple Cookies of the Http Response.
   *
   * @param cookies Http Response Cookies.
   * @throws {TypeError} The provided Http Cookies is invalid.
   * @returns Http Response.
   */
  public setCookies(cookies: NodeJS.Dict<unknown>): HttpResponse {
    this.#logger.debug(`[${this.constructor.name}] Called setCookies()`, 'dc00779f-1c2b-4512-9445-49cfea4483d5', {
      cookies,
    });

    if (!isPlainObject(cookies)) {
      const error = new TypeError('The provided Http Cookies is invalid.');

      this.#logger.error(
        `[${this.constructor.name}] The provided Http Cookies is invalid`,
        '1fa2fdaf-8fb5-4460-b77c-1f91a7e0ae23',
        { cookies },
        error,
      );

      throw error;
    }

    Object.entries(cookies).forEach(([cookie, value]) => this.setCookie(cookie, value));

    this.#logger.debug(`[${this.constructor.name}] Completed setCookies()`, '1950cdc2-7ec7-4820-956a-987d3b40a975', {
      cookies,
    });

    return this;
  }

  /**
   * Redirects the User-Agent to the provided URL.
   *
   * @param url URL that the User-Agent will be redirected to.
   * @throws {TypeError} The provided URL is invalid.
   * @returns Http Response.
   */
  public redirect(url: URL): HttpResponse {
    this.#logger.debug(`[${this.constructor.name}] Called redirect()`, '0c423966-52e6-4ccf-b4ba-ee600fbcde6d', { url });

    if (!(url instanceof URL)) {
      const error = new TypeError('The provided URL is invalid.');

      this.#logger.error(
        `[${this.constructor.name}] The provided URL is invalid`,
        'fb5c2207-b5ac-4dfe-bc68-317d4b89d4be',
        { url },
        error,
      );

      throw error;
    }

    this.setHeader('location', url.href);
    this.setStatus(303);

    this.#logger.debug(`[${this.constructor.name}] Completed redirect()`, 'b1108865-8901-4ccd-9d71-258d211f75c8', {
      url,
    });

    return this;
  }

  /**
   * Defines the provided object as the JSON Encoded Body of the Http Response.
   *
   * @param data Object to be used as the JSON Encoded Body of the Http Response.
   * @throws {TypeError} The provided Data is invalid.
   * @returns Http Response.
   */
  public json<T>(data: T): HttpResponse {
    this.#logger.debug(`[${this.constructor.name}] Called json()`, 'cc2625ca-f169-49af-a4d5-198704ed1923', { data });

    if (!this.isValidJsonData(data)) {
      const error = new TypeError('The provided Data is invalid.');

      this.#logger.error(
        `[${this.constructor.name}] The provided Data is invalid`,
        'b8d49f56-e880-4a71-95cc-41e7df6267eb',
        { data },
        error,
      );

      throw error;
    }

    this.setHeader('content-type', 'application/json');
    this.#body = Buffer.from(jsonStringify(data), 'utf8');

    this.#logger.debug(`[${this.constructor.name}] Completed json()`, '3c957b43-d84f-4ee3-a7d4-7f76a93b7bdc', { data });

    return this;
  }

  private isValidJsonData(data: unknown): boolean {
    if (data === null || typeof data === 'boolean' || typeof data === 'number' || typeof data === 'string') {
      return true;
    }

    if (Array.isArray(data)) {
      return data.every(this.isValidJsonData);
    }

    if (typeof data === 'object') {
      return (
        ('toJSON' in data && typeof data.toJSON === 'function') ||
        (isPlainObject(data) && Object.values(data).every(this.isValidJsonData))
      );
    }

    return false;
  }
}
