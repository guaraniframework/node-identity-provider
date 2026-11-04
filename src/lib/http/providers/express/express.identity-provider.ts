import { Buffer } from 'buffer';
import { raw, Request, RequestHandler, Response, Router } from 'express';
import { URL } from 'url';

import { Injectable, InjectAll } from '@guarani/di';
import { parseEnumValue } from '@guarani/primitives';

import { Endpoint } from '../../../endpoints/endpoint';
import { Logger } from '../../../loggers/logger';
import { HttpRequest } from '../../request/http-request';
import { HttpRequestMethod } from '../../request/http-request-method.enum';
import { HttpResponse } from '../../response/http-response';
import { HttpRouteHandler } from '../../route/http-route.handler';
import { IdentityProvider } from '../identity-provider';

type ExpressRequestMethod = 'delete' | 'get' | 'post' | 'put';

/**
 * Implementation of the ExpressJS Identity Provider.
 */
@Injectable()
export class ExpressIdentityProvider extends IdentityProvider {
  /**
   * NodeJS Environment.
   */
  // istanbul ignore next
  private readonly environment: string = process.env['NODE_ENV'] ?? 'development';

  /**
   * Instantiates a new ExpressJS Identity Provider.
   *
   * @param logger Logger of the Identity Provider.
   * @param endpoints Endpoints of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    @InjectAll(Endpoint) public override readonly endpoints: Endpoint[],
  ) {
    super(logger, endpoints);
  }

  /**
   * Creates an ExpressJS Router with the Identity Provider Endpoints.
   */
  public handle(): Router {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, 'a2595a96-f2c8-4d6e-8427-7e2f81ff2809', null);

    const router = Router();

    router.use('/oidc', raw({ type: '*/*' }));

    this.endpoints.forEach((endpoint) => {
      endpoint.routes.forEach((route) => {
        router[route.method.toLowerCase() as ExpressRequestMethod](
          endpoint.path,
          this.createRequestHandler(route.handler.bind(endpoint)),
        );
      });
    });

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, 'a2595a96-f2c8-4d6e-8427-7e2f81ff2809', null);

    return router;
  }

  /**
   * Creates an ExpressJS Request Handler based on the provided Identity Provider Http Route Handler.
   *
   * @param httpRouteHandler Identity Provider Http Route Handler.
   * @returns ExpressJS Request Handler.
   */
  private createRequestHandler(httpRouteHandler: HttpRouteHandler): RequestHandler {
    this.logger.debug(
      `[${this.constructor.name}] Called createRequestHandler()`,
      '86fabf53-5861-4a7e-90cd-954fd6250c68',
      null,
    );

    const requestHandler = async (request: Request, response: Response): Promise<void> => {
      const httpRequest = this.createHttpRequest(request);
      const httpResponse = await httpRouteHandler(httpRequest);
      return this.parseHttpResponse(httpResponse, response);
    };

    this.logger.debug(
      `[${this.constructor.name}] Completed createRequestHandler()`,
      '8b73a3d3-a5a2-47db-9958-13cbeefb0ee2',
      null,
    );

    return requestHandler;
  }

  /**
   * Returns an Identity Provider Http Request based on the provided ExpressJS Request.
   *
   * @param request ExpressJS Request.
   * @throws {TypeError} Failed to create the Identity Provider Http Request.
   * @returns Identity Provider Http Request based on the provided ExpressJS Request.
   */
  private createHttpRequest(request: Request): HttpRequest {
    this.logger.debug(
      `[${this.constructor.name}] Called createHttpRequest()`,
      '60f56283-fbf6-4708-90b8-c2ebc4886974',
      null,
    );

    const httpRequest = new HttpRequest({
      body: request.body ?? Buffer.alloc(0),
      cookies: request.signedCookies,
      headers: request.headers,
      method: parseEnumValue(HttpRequestMethod, request.method.toUpperCase())!,
      url: new URL(`${request.protocol}://${request.get('host')}${request.originalUrl}`),
    });

    this.logger.debug(
      `[${this.constructor.name}] Completed createHttpRequest()`,
      'eafdabcf-e06d-41ed-8127-cbf74b41b6fc',
      null,
    );

    return httpRequest;
  }

  /**
   * Parses the provided Identity Provider Http Response into the provided ExpressJS Response.
   *
   * @param httpResponse Identity Provider Http Response.
   * @param response ExpressJS Response.
   */
  private parseHttpResponse(httpResponse: HttpResponse, response: Response): void {
    this.logger.debug(
      `[${this.constructor.name}] Called parseHttpResponse()`,
      '5473a156-1953-486d-a9d0-2b028052a75d',
      null,
    );

    const { body, cookies, headers, status } = httpResponse;

    Object.entries(headers).forEach(([name, value]) => {
      response.setHeader(name, value!);
    });

    // istanbul ignore next
    Object.entries(cookies).forEach(([name, value]) => {
      response.cookie(name, value, { httpOnly: true, secure: this.environment === 'production', signed: true });
    });

    response.status(status).send(body);

    this.logger.debug(
      `[${this.constructor.name}] Completed parseHttpResponse()`,
      'd33b76ea-a889-4b5d-a815-2b854f7d9d67',
      null,
    );
  }
}
