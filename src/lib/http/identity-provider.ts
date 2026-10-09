import { Injectable } from '@guarani/di';

import { ErrorEndpoint } from '../endpoints/error/error.endpoint';
import { Logger } from '../logger/logger';
import { ErrorResponse } from '../responses/error/error-response';
import { TemplateEngine } from '../template-engine/template-engine';
import { asIdentityProviderError } from '../utils/as-identity-provider-error/as-identity-provider-error';
import { HttpRequest } from './request/http-request';
import { HttpResponse } from './response/http-response';

/**
 * Implementation of the Identity Provider.
 */
@Injectable()
export class IdentityProvider {
  /**
   * Instantiates a new Identity Provider.
   *
   * @param logger Logger of the Identity Provider.
   * @param templateEngine Template Engine of the Identity Provider.
   * @param errorEndpoint Error Endpoint of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly templateEngine: TemplateEngine,
    private readonly errorEndpoint: ErrorEndpoint,
  ) {}

  /**
   * Creates an Http Error Response.
   *
   * This Endpoint is responsible for displaying the Authorization Errors that are deemed unsafe
   * to be redirected to the Redirect URI provided by the Client.
   *
   * @param request Http Request.
   * @param response Http Response.
   */
  public async error(request: HttpRequest, response: HttpResponse): Promise<void> {
    this.logger.debug(`[${this.constructor.name}] Called error()`, '5ab10934-0f4b-4232-aa7b-9e7a19be176f', {
      request,
      response,
    });

    let errorResponse: ErrorResponse;

    try {
      errorResponse = await this.errorEndpoint.getErrorResponse(request);
    } catch (err: unknown) {
      const error = asIdentityProviderError(err);
      errorResponse = error.toJSON();
      response.setStatus(error.status).setHeaders(error.headers);
    }

    const renderedErrorView = await this.templateEngine.render('error', errorResponse);
    response.html(renderedErrorView);

    this.logger.debug(`[${this.constructor.name}] Completed error()`, '1663a058-6210-4cde-87a0-cdf947fab44e', {
      request,
      response,
    });
  }
}
