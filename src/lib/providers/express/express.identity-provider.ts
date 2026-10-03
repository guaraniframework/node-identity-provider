import { Request, Response } from 'express';
import { URL } from 'url';

import { Injectable, InjectAll } from '@guarani/di';

import { Endpoint } from '../../endpoints/endpoint';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.type';
import { HttpResponse } from '../../http/response/http-response';
import { Logger } from '../../logger/logger';
import { IdentityProvider } from '../identity-provider';

/**
 * Implementation of the Express Identity Provider.
 */
@Injectable()
export class ExpressIdentityProvider extends IdentityProvider {
  /**
   * Instantiates a new Express Identity Provider.
   *
   * @param logger Logger of the Identity Provider.
   * @param endpoints Endpoints of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    @InjectAll(Endpoint) protected override readonly endpoints: Endpoint[],
  ) {
    super(logger, endpoints);

    this.handle = this.handle.bind(this);
  }

  /**
   * Creates an Identity Provider Http Request from the provided NodeJS Http Request.
   *
   * @param request NodeJS Http Request.
   * @returns Identity Provider Http Request.
   */
  protected createHttpRequest(request: Request): HttpRequest {
    this.logger.debug(`[${this.constructor.name}] Called createHttpRequest()`, 'b3f6e5f3-0d66-4dea-a122-081f4a77ce9c');

    const httpRequest = new HttpRequest({
      body: request.body,
      cookies: request.cookies,
      headers: request.headers,
      method: request.method.toUpperCase() as HttpRequestMethod,
      url: new URL(`${request.protocol}://${request.get('host')}${request.originalUrl}`),
    });

    this.logger.debug(
      `[${this.constructor.name}] Completed createHttpRequest()`,
      '1be55e7d-15d6-4224-91a7-93d96aabd290',
    );

    return httpRequest;
  }

  /**
   * Parses the provided Identity Provider Http Response into the provided NodeJS Http Response.
   *
   * @param httpResponse Identity Provider Http Response.
   * @param response NodeJS Http Response.
   */
  protected parseHttpResponse(httpResponse: HttpResponse, response: Response): void {
    this.logger.debug(`[${this.constructor.name}] Called parseHttpResponse()`, 'b3f6e5f3-0d66-4dea-a122-081f4a77ce9c');

    Object.entries(httpResponse.headers).forEach(([header, value]) => response.setHeader(header, value!));

    Object.entries(httpResponse.cookies).forEach(([cookie, value]) => {
      value === null
        ? response.clearCookie(cookie, { signed: true })
        : response.cookie(cookie, value, { signed: true });
    });

    response.status(httpResponse.status).send(httpResponse.body);

    this.logger.debug(
      `[${this.constructor.name}] Completed parseHttpResponse()`,
      '6e4bac40-6434-4f7c-b106-16bd75c5ac1c',
    );
  }
}
