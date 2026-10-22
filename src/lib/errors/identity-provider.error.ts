import { OutgoingHttpHeader, OutgoingHttpHeaders } from 'http';

import { hasEnumValue, isNonEmptyString, isPlainObject } from '@guarani/primitives';

import { HttpResponseStatus } from '../http/response/http-response-status.enum';
import { ErrorResponse } from '../responses/error/error-response';
import { IdentityProviderErrorOptions } from './identity-provider-error.options';

/**
 * Implementation of the Identity Provider Error.
 *
 * The Identity Provider Error is a special case of an Http-like Error Response.
 *
 * It allows the definition of Http Response Headers and Status Codes,
 * and it also provides a method to get the Error Parameters as an Error Response
 * that can be used as the Body or Redirect Data of an Http Error Response.
 */
export class IdentityProviderError extends Error {
  /**
   * Error Code.
   */
  public readonly error: string;

  /**
   * Error Description.
   */
  public readonly description: string;

  /**
   * Http Response Headers.
   */
  public readonly headers: OutgoingHttpHeaders = {};

  /**
   * Indicates if the Identity Provider Error is fatal.
   */
  public readonly fatal: boolean;

  /**
   * Http Response Status Code.
   */
  #status: HttpResponseStatus = HttpResponseStatus.BadRequest;

  /**
   * Error Page URI.
   */
  #uri?: string;

  /**
   * Http Response Status Code.
   */
  public get status(): HttpResponseStatus {
    return this.#status;
  }

  /**
   * Error Page URI.
   */
  public get uri(): string | undefined {
    return this.#uri;
  }

  /**
   * Instantiates a new Identity Provider Error.
   *
   * @param error Error Code.
   * @param description Error Description.
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(error: string, description: string, options: IdentityProviderErrorOptions = {}) {
    if (!isNonEmptyString(error)) {
      throw new TypeError('The provided Error Code is invalid.');
    }

    if (!isNonEmptyString(description)) {
      throw new TypeError('The provided Error Description is invalid.');
    }

    if (!isPlainObject(options)) {
      throw new TypeError('The provided Error Options is invalid.');
    }

    if ('fatal' in options && typeof options.fatal !== 'boolean') {
      throw new TypeError('The provided Error Option Fatal is invalid.');
    }

    super(description, options);

    this.error = error;
    this.description = description;
    this.fatal = options.fatal ?? false;
  }

  /**
   * Sets an Http Response Header of the Identity Provider Error.
   *
   * @param name Name of the Http Response Header.
   * @param value Value of the Http Response Header.
   * @throws {TypeError} One of the provided arguments is invalid.
   * @returns Identity Provider Error.
   */
  public setHttpHeader(name: string, value: OutgoingHttpHeader): IdentityProviderError {
    if (!isNonEmptyString(name)) {
      throw new TypeError('The provided Http Header Name is invalid.');
    }

    if (
      !isNonEmptyString(value) &&
      (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) &&
      (!Array.isArray(value) || value.length === 0 || value.some((element) => !isNonEmptyString(element)))
    ) {
      throw new TypeError('The provided Http Header Value is invalid.');
    }

    this.headers[name] = value;
    return this;
  }

  /**
   * Sets multiple Http Response Headers of the Identity Provider Error.
   *
   * @param headers Http Response Headers.
   * @throws {TypeError} The provided Http Headers is invalid.
   * @returns Identity Provider Error.
   */
  public setHttpHeaders(headers: OutgoingHttpHeaders): IdentityProviderError {
    if (!isPlainObject(headers)) {
      throw new TypeError('The provided Http Headers is invalid.');
    }

    Object.entries(headers).forEach(([header, value]) => this.setHttpHeader(header, value!));
    return this;
  }

  /**
   * Sets the Http Response Status of the Identity Provider Error.
   *
   * @param status Http Response Status.
   * @throws {TypeError} The provided Http Status is invalid.
   * @returns Identity Provider Error.
   */
  public setHttpStatus(status: HttpResponseStatus): IdentityProviderError {
    if (typeof status !== 'number' || !Number.isSafeInteger(status) || !hasEnumValue(HttpResponseStatus, status)) {
      throw new TypeError('The provided Http Status is invalid.');
    }

    this.#status = status;
    return this;
  }

  /**
   * Sets the Error Page URI of the Identity Provider Error.
   *
   * @param status Error Page URI.
   * @throws {TypeError} The provided Error Page URI is invalid.
   * @returns Identity Provider Error.
   */
  public setUri(uri: string): IdentityProviderError {
    if (!isNonEmptyString(uri) || !/^[\x21\x23-\x5b\x5d-\x7e]+$/.test(uri)) {
      throw new TypeError('The provided Error Page URI is invalid.');
    }

    this.#uri = uri;
    return this;
  }

  /**
   * Formats the Identity Provider Error into an Error Response.
   *
   * @returns Identity Provider Error formatted as an Error Response.
   */
  public toJSON(): ErrorResponse {
    const response: ErrorResponse = { error: this.error, error_description: this.description };

    if (isNonEmptyString(this.#uri)) {
      response.error_uri = this.#uri;
    }

    return response;
  }
}
