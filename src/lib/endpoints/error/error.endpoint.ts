import { Injectable } from '@guarani/di';

import { HttpRequest } from '../../http/request/http-request';
import { Logger } from '../../logger/logger';
import { ErrorResponse } from '../../responses/error/error-response';
import { ErrorRequestValidator } from '../../validators/error/error-request.validator';

/**
 * Implementation of the Error Endpoint.
 *
 * This Endpoint is responsible for displaying the Authorization Errors that are deemed unsafe
 * to be redirected to the Redirect URI provided by the Client.
 */
@Injectable()
export class ErrorEndpoint {
  /**
   * Instantiates a new Error Endpoint.
   *
   * @param logger Logger of the Identity Provider.
   * @param validator Error Request Validator of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly validator: ErrorRequestValidator,
  ) {}

  /**
   * Parses the Http Request and returns an Error Response based on the provided Error Response Parameters.
   *
   * @param request Http Request.
   * @throws {MethodNotAllowedError} The requested Http Request Method is not allowed.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns Error Response.
   */
  public async getErrorResponse(request: HttpRequest): Promise<ErrorResponse> {
    this.logger.debug(`[${this.constructor.name}] Called getErrorResponse()`, 'de262291-9bbf-4818-bef2-ff3b3a57c5b3', {
      request,
    });

    const { error } = await this.validator.validate(request);
    const errorResponse = error.toJSON();

    this.logger.debug(
      `[${this.constructor.name}] Completed getErrorResponse()`,
      '42fc78d1-7d4e-447a-9f4b-94177af5865c',
      { request, error_response: errorResponse },
    );

    return errorResponse;
  }
}
