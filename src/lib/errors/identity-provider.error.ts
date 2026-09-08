import { OutgoingHttpHeader, OutgoingHttpHeaders } from 'http';

import { getContainer } from '@guarani/di';
import { isNonEmptyString, isPlainObject } from '@guarani/primitives';

import { Logger } from '../logger/logger';
import { CONTAINER } from '../metadata/container.token';
import { ErrorResponse } from '../responses/error-response';
import { ErrorCode } from './error-code.type';

/**
 * Base Error class for the Identity Provider.
 */
export abstract class IdentityProviderError extends Error {
  /**
   * Error Code.
   */
  public abstract readonly error: ErrorCode;

  /**
   * Http Response Status Code.
   */
  public readonly status: number = 400;

  /**
   * Http Response Headers.
   */
  public readonly headers: OutgoingHttpHeaders = {};

  /**
   * Error Page URI.
   */
  protected readonly uri?: string;

  /**
   * Error Description.
   */
  private description: string;

  /**
   * Logger of the Identity Provider.
   */
  readonly #logger: Logger;

  /**
   * Instantiates a new Identity Provider Error.
   *
   * @param description Error Description
   * @param options Error Options.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  public constructor(description: string, options?: ErrorOptions) {
    if (!isNonEmptyString(description)) {
      throw new TypeError('The provided Description is invalid.');
    }

    if (arguments.length === 2 && !isPlainObject(options)) {
      throw new TypeError('The provided Error Options is invalid.');
    }

    super(description, options);

    this.description = description;

    this.#logger = getContainer(CONTAINER).resolve(Logger);
  }

  /**
   * Sets an Http Response Header of the Identity Provider Error.
   *
   * @param header Name of the Http Response Header.
   * @param value Value of the Http Response Header.
   * @throws {TypeError} One of the provided arguments is invalid.
   * @returns Identity Provider Error.
   */
  public setHttpHeader(header: string, value: OutgoingHttpHeader): IdentityProviderError {
    this.#logger.debug(`[${this.constructor.name}] Called setHttpHeader()`, '4c16c6df-674c-490b-b441-e3ef15b69883', {
      header,
      value,
    });

    if (!isNonEmptyString(header)) {
      const error = new TypeError('The provided Http Header Name is invalid.');

      this.#logger.error(
        `[${this.constructor.name}] The provided Http Header Name is invalid`,
        'e94b8c0e-b401-4f3c-8582-49f8f904f610',
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
        'de07f209-6476-4a2f-a546-d209ec899773',
        { header, value },
        error,
      );

      throw error;
    }

    this.headers[header] = value;

    this.#logger.debug(`[${this.constructor.name}] Completed setHttpHeader()`, '06ff10a0-b712-4880-a7e5-d76f6ee27868', {
      header,
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
   * Formats the Identity Provider Error into an Error Response.
   *
   * @returns Identity Provider Error formatted as an Error Response.
   */
  public toJSON(): ErrorResponse {
    this.#logger.debug(`[${this.constructor.name}] Called toJSON()`, '8aa7072a-e609-4a54-bf3c-36d347183426');

    const response: ErrorResponse = { error: this.error, error_description: this.description };

    if (isNonEmptyString(this.uri)) {
      response.error_uri = this.uri;
      this.#logger.debug(`[${this.constructor.name}] Added Error URI`, '5117701f-3f3d-42fc-aecd-b166fb27a05a');
    }

    this.#logger.debug(`[${this.constructor.name}] Completed toJSON()`, 'e786ae4b-8005-4d52-8ce3-2b95db9af5df', {
      response,
    });

    return response;
  }
}
