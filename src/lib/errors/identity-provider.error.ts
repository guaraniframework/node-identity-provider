import { OutgoingHttpHeader, OutgoingHttpHeaders } from 'http';

import { getContainer } from '@guarani/di';
import { isNonEmptyString, isPlainObject } from '@guarani/primitives';

import { Logger } from '../logger/logger';
import { CONTAINER } from '../metadata/tokens';
import { ErrorResponse } from '../responses/error/error-response';
import { IdentityProviderErrorOptions } from './identity-provider-error.options';

/**
 * Base Error class for the Identity Provider.
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
  #status: number = 400;

  /**
   * Error Page URI.
   */
  #uri?: string;

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

    super(description, options);

    this.error = error;
    this.description = description;
    this.fatal = options.fatal ?? false;

    this.#logger = getContainer(CONTAINER).resolve(Logger);
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
    this.#logger.debug(`[${this.constructor.name}] Called setHttpHeader()`, '4c16c6df-674c-490b-b441-e3ef15b69883', {
      name,
      value,
    });

    if (!isNonEmptyString(name)) {
      const error = new TypeError('The provided Http Header Name is invalid.');

      this.#logger.error(
        `[${this.constructor.name}] The provided Http Header Name is invalid`,
        'e94b8c0e-b401-4f3c-8582-49f8f904f610',
        { name, value },
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
        'de07f209-6476-4a2f-a546-d209ec899773',
        { name, value },
        error,
      );

      throw error;
    }

    this.headers[name] = value;

    this.#logger.debug(`[${this.constructor.name}] Completed setHttpHeader()`, '06ff10a0-b712-4880-a7e5-d76f6ee27868', {
      name,
      value,
    });

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
    this.#logger.debug(`[${this.constructor.name}] Called setHttpHeaders()`, '89ccc377-139d-45b3-a822-9411aa8feae1', {
      headers,
    });

    if (!isPlainObject(headers)) {
      const error = new TypeError('The provided Http Headers is invalid.');

      this.#logger.error(
        `[${this.constructor.name}] The provided Http Headers is invalid`,
        '336dcab3-19e5-4465-b98a-3f29df25c53a',
        { headers },
        error,
      );

      throw error;
    }

    Object.entries(headers).forEach(([header, value]) => this.setHttpHeader(header, value!));

    this.#logger.debug(
      `[${this.constructor.name}] Completed setHttpHeaders()`,
      'c09424e2-cfa0-46cd-a5a9-3705112fc3b0',
      { headers },
    );

    return this;
  }

  /**
   * Sets the Http Response Status of the Identity Provider Error.
   *
   * @param status Http Response Status.
   * @throws {TypeError} The provided Http Status is invalid.
   * @returns Identity Provider Error.
   */
  public setHttpStatus(status: number): IdentityProviderError {
    this.#logger.debug(`[${this.constructor.name}] Called setHttpStatus()`, '6307d267-78f1-4a10-bd04-75ad534f700d', {
      status,
    });

    if (!Number.isSafeInteger(status)) {
      const error = new TypeError('The provided Http Status is invalid.');

      this.#logger.error(
        `[${this.constructor.name}] The provided Http Status is invalid`,
        '2bb27714-68cc-4dcc-98d3-32506d56c220',
        { status },
        error,
      );

      throw error;
    }

    this.#status = status;

    this.#logger.debug(`[${this.constructor.name}] Completed setHttpStatus()`, '3bfb2c1d-e239-47b3-bcd7-b1e3b507b330', {
      status,
    });

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
    this.#logger.debug(`[${this.constructor.name}] Called setUri()`, '2b9dd53e-e239-4e4b-ad79-ebe976f6d816', {
      uri,
    });

    if (!isNonEmptyString(uri) || !/^[\x21\x23-\x5b\x5d-\x7e]+$/.test(uri)) {
      const error = new TypeError('The provided Error Page URI is invalid.');

      this.#logger.error(
        `[${this.constructor.name}] The provided Error Page URI is invalid`,
        '6a2e4338-ee31-4f7b-b705-82aa6e7853bb',
        { uri },
        error,
      );

      throw error;
    }

    this.#uri = uri;

    this.#logger.debug(`[${this.constructor.name}] Completed setUri()`, '1bbfeb23-9adf-4acc-901c-459b3744482e', {
      uri,
    });

    return this;
  }

  /**
   * Formats the Identity Provider Error into an Error Response.
   *
   * @returns Identity Provider Error formatted as an Error Response.
   */
  public toJSON(): ErrorResponse {
    this.#logger.debug(`[${this.constructor.name}] Called toJSON()`, '8aa7072a-e609-4a54-bf3c-36d347183426');

    const response = new ErrorResponse({ error: this.error, error_description: this.description });

    if (isNonEmptyString(this.#uri)) {
      response.error_uri = this.#uri;
    }

    this.#logger.debug(`[${this.constructor.name}] Completed toJSON()`, 'e786ae4b-8005-4d52-8ce3-2b95db9af5df', {
      response,
    });

    return response;
  }
}
