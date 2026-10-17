import { Injectable } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ErrorRequestContext } from '../../context/error-request.context';
import { EndpointName } from '../../endpoints/endpoint-name.type';
import { IdentityProviderError } from '../../errors/identity-provider.error';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { Logger } from '../../logger/logger';
import { ErrorRequest } from '../../requests/error-request';
import { RequestValidator } from '../request-validator';

/**
 * Validator for the Error Endpoint Http Request.
 *
 * It parses the Parameters of the Request and instantiates an Identity Provider Error based on them.
 */
@Injectable()
export class ErrorRequestValidator extends RequestValidator<ErrorRequestContext> {
  /**
   * Name of the Endpoint that uses this Validator.
   */
  public readonly endpoint: EndpointName = 'error';

  /**
   * Http Request Methods supported by the Validator.
   */
  public readonly supportedHttpRequestMethods: HttpRequestMethod[] = [HttpRequestMethod.GET, HttpRequestMethod.POST];

  /**
   * Instantiates a new Error Request Validator.
   *
   * @param logger Logger of the Identity Provider.
   */
  public constructor(protected override readonly logger: Logger) {
    super(logger);
  }

  /**
   * Validates the Http Request and returns the actors of the Error Request Context.
   *
   * @param request Http Request.
   * @throws {MethodNotAllowedError} The requested Http Request Method is not allowed.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns Error Request Context.
   */
  public async validate(request: HttpRequest): Promise<ErrorRequestContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, '806b99fd-832c-41e4-9f0b-2c52b08c6f5b', {
      request,
    });

    this.checkHttpRequestMethod(request);

    const parameters = (request.method === HttpRequestMethod.GET ? request.query : request.form()) as ErrorRequest;
    const error = this.getIdentityProviderError(parameters);

    const context: ErrorRequestContext = { parameters, error };

    this.logger.debug(`[${this.constructor.name}] Called validate()`, '401e012e-3f4a-49ac-8681-3558b8e8574d', {
      request,
      context,
    });

    return context;
  }

  /**
   * Checks and returns the Error Parameters provided by the Client.
   *
   * @param parameters Parameters of the Interaction Request.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns Error object based on the Error Parameters provided by the Client.
   */
  private getIdentityProviderError(parameters: ErrorRequest): IdentityProviderError {
    this.logger.debug(
      `[${this.constructor.name}] Called getIdentityProviderError()`,
      '55b16d7b-2b7f-4883-8e60-2b5358ac4b3b',
      { parameters },
    );

    if (!('error' in parameters) || !isNonEmptyString(parameters.error)) {
      const error = new InvalidRequestError('Invalid parameter "error".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "error"`,
        '99fc31ae-66a3-4b4d-b9ab-94f83dab7cd0',
        { parameters },
        error,
      );

      throw error;
    }

    if (!('error_description' in parameters) || !isNonEmptyString(parameters.error_description)) {
      const error = new InvalidRequestError('Invalid parameter "error_description".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "error_description"`,
        '5c310aca-6ee8-4e7c-a4c9-becd08093c63',
        { parameters },
        error,
      );

      throw error;
    }

    if ('error_uri' in parameters && !isNonEmptyString(parameters.error_uri)) {
      const error = new InvalidRequestError('Invalid parameter "error_uri".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "error_uri"`,
        'a49246fd-c157-43a0-bf01-b4e46079f5ce',
        { parameters },
        error,
      );

      throw error;
    }

    const error = new IdentityProviderError(parameters.error, parameters.error_description);

    if ('error_uri' in parameters) {
      error.setUri(parameters.error_uri);
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed getIdentityProviderError()`,
      '334a9d27-b143-407d-924e-0b688840b788',
      { parameters, error },
    );

    return error;
  }
}
