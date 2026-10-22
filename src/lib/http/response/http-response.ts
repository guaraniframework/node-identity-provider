import { Buffer } from 'buffer';
import { OutgoingHttpHeader, OutgoingHttpHeaders } from 'http';
import { URL } from 'url';

import { hasEnumValue, isNonEmptyString, isPlainObject, jsonStringify } from '@guarani/primitives';

import { HttpResponseStatus } from './http-response-status.enum';

/**
 * Abstraction of the Http Response.
 *
 * This abstraction is used to facilitate the integration of the Identity Provider
 * with the multiple Http Web Servers developed in NodeJS.
 */
export class HttpResponse {
  /**
   * Http Response Status.
   */
  #status: HttpResponseStatus = HttpResponseStatus.OK;

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
   * Http Response Status.
   */
  public get status(): HttpResponseStatus {
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
    this.isValidJsonData = this.isValidJsonData.bind(this);
  }

  /**
   * Sets the Status of the Http Response.
   *
   * @param status Status of the Http Response.
   * @throws {TypeError} The provided Http Response Status is invalid.
   * @returns Http Response.
   */
  public setStatus(status: HttpResponseStatus): HttpResponse {
    if (typeof status !== 'number' || !Number.isSafeInteger(status) || !hasEnumValue(HttpResponseStatus, status)) {
      throw new TypeError('The provided Http Response Status is invalid.');
    }

    this.#status = status;
    return this;
  }

  /**
   * Sets a Header of the Http Response.
   *
   * @param name Name of the Http Response Header.
   * @param value Value of the Http Response Header.
   * @throws {TypeError} One of the provided arguments is invalid.
   * @returns Http Response.
   */
  public setHeader(name: string, value: OutgoingHttpHeader): HttpResponse {
    if (!isNonEmptyString(name)) {
      throw new TypeError('The provided Http Response Header Name is invalid.');
    }

    if (
      !isNonEmptyString(value) &&
      (typeof value !== 'number' || !Number.isSafeInteger(value)) &&
      (!Array.isArray(value) || value.length === 0 || value.some((element) => !isNonEmptyString(element)))
    ) {
      throw new TypeError('The provided Http Response Header Value is invalid.');
    }

    this.#headers[name] = value;
    return this;
  }

  /**
   * Sets multiple Headers of the Http Response.
   *
   * @param headers Http Response Headers.
   * @throws {TypeError} The provided Http Headers is invalid.
   * @returns Http Response.
   */
  public setHeaders(headers: OutgoingHttpHeaders): HttpResponse {
    if (!isPlainObject(headers)) {
      throw new TypeError('The provided Http Response Headers is invalid.');
    }

    Object.entries(headers).forEach(([header, value]) => this.setHeader(header, value!));
    return this;
  }

  /**
   * Sets a Cookie of the Http Response.
   *
   * @param name Name of the Http Response Cookie.
   * @param value Value of the Http Response Cookie.
   * @throws {TypeError} The provided Http Response Cookie is invalid.
   * @returns Http Response.
   */
  public setCookie(name: string, value: unknown): HttpResponse {
    if (!isNonEmptyString(name)) {
      throw new TypeError('The provided Http Response Cookie Name is invalid.');
    }

    this.#cookies[name] = value;
    return this;
  }

  /**
   * Sets multiple Cookies of the Http Response.
   *
   * @param cookies Http Response Cookies.
   * @throws {TypeError} The provided Http Response Cookies is invalid.
   * @returns Http Response.
   */
  public setCookies(cookies: NodeJS.Dict<unknown>): HttpResponse {
    if (!isPlainObject(cookies)) {
      throw new TypeError('The provided Http Response Cookies is invalid.');
    }

    Object.entries(cookies).forEach(([cookie, value]) => this.setCookie(cookie, value));
    return this;
  }

  /**
   * Redirects the User-Agent to the provided Redirect URL.
   *
   * @param url URL that the User-Agent will be redirected to.
   * @throws {TypeError} The provided Redirect URL is invalid.
   * @returns Http Response.
   */
  public redirect(url: string | URL): HttpResponse {
    if (!(url instanceof URL) && (!isNonEmptyString(url) || !URL.canParse(url))) {
      throw new TypeError('The provided Redirect URL is invalid.');
    }

    this.setHeader('location', new URL(url).href).setStatus(HttpResponseStatus.SeeOther);
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
    if (!this.isValidJsonData(data)) {
      throw new TypeError('The provided JSON Data is invalid.');
    }

    this.setHeader('content-type', 'application/json');
    this.#body = Buffer.from(jsonStringify(data), 'utf8');

    return this;
  }

  /**
   * Defines the provided Html String as the Body of the Http Response.
   *
   * @param html Html String to be used as the Body of the Http Response.
   * @throws {TypeError} The provided Data is invalid.
   * @returns Http Response.
   */
  public html(html: string): HttpResponse {
    if (!isNonEmptyString(html)) {
      throw new TypeError('The provided Html is invalid.');
    }

    this.setHeader('content-type', 'text/html; charset=UTF-8');
    this.#body = Buffer.from(html, 'utf8');

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
