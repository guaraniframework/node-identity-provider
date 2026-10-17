import { Buffer } from 'buffer';
import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

import { Injectable } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { MethodNotAllowedError } from '../../../errors/method-not-allowed/method-not-allowed.error';
import { NotFoundError } from '../../../errors/not-found/not-found.error';
import { Logger } from '../../../logger/logger';
import { Settings } from '../../../settings/settings';
import { asIdentityProviderError } from '../../../utils/as-identity-provider-error/as-identity-provider-error';
import { IdentityProvider } from '../../identity-provider';
import { HttpRequest } from '../../request/http-request';
import { HttpRequestMethod } from '../../request/http-request-method.enum';
import { HttpResponse } from '../../response/http-response';
import { HttpHandler } from '../../router/http-handler.type';
import { HttpRouter } from '../../router/http-router';
import { IdentityServer } from '../identity-server';

/**
 * Implementation of the Native NodeJS Identity Server.
 */
@Injectable()
export class NodeIdentityServer extends IdentityServer {
  /**
   * NodeJS Environment.
   */
  private readonly environment?: string = process.env['NODE_ENV'];

  /**
   * Instantiates a new Node Identity Server.
   *
   * @param logger Logger of the Identity Provider.
   * @param provider Identity Provider.
   * @param router Http Router of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    protected override readonly provider: IdentityProvider,
    protected override readonly router: HttpRouter,
    private readonly settings: Settings,
  ) {
    super(logger, provider, router);

    this.logger.warn(
      `[${this.constructor.name}] Using the default Node Identity Server. This is only recommended for development environments.`,
      '0fa83143-3000-4c25-a21c-a77cc3b365b9',
      null,
    );

    this.handle = this.handle.bind(this);
  }

  /**
   * Handler used to interface the native Http Server with the Identity Provider.
   *
   * @param request Native Http Incoming Message.
   * @param response Native Http Server Response.
   */
  public async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '05956a82-c04f-4b88-92b6-ca49c81b1277', null);

    const httpResponse = new HttpResponse();

    try {
      const httpRequest = await this.createHttpRequest(request);

      const handler = this.getEndpoint(httpRequest);
      await handler(httpRequest, httpResponse);
    } catch (err: unknown) {
      const error = asIdentityProviderError(err);
      httpResponse.setStatus(error.status).setHeaders(error.headers).json(error);
    }

    await this.parseHttpResponse(httpResponse, response);

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, 'e811cfe6-84dd-4a61-9620-f72867920228', null);
  }

  /**
   * Retrieves the Endpoint requested by the Client.
   *
   * @throws {NotFoundError} The requested Endpoint was not found.
   * @throws {MethodNotAllowedError} The requested Endpoint exists, but does not support the requested Http Request Method.
   * @returns Endpoint requested by the Client.
   */
  private getEndpoint(httpRequest: HttpRequest): HttpHandler {
    this.logger.debug(`[${this.constructor.name}] Called getEndpoint()`, 'eb78bfda-a161-4985-95cf-66592e090d15', {
      http_request: httpRequest,
    });

    const endpoint = this.router.getEndpoints().find((endpoint) => endpoint.path === httpRequest.path);

    if (typeof endpoint === 'undefined') {
      const error = new NotFoundError(`Endpoint "${httpRequest.path}" not found.`);

      this.logger.error(
        `[${this.constructor.name}] Endpoint "${httpRequest.path}" not found`,
        '786373a1-ecd1-4dd8-912b-865d4d262d60',
        { http_request: httpRequest },
        error,
      );

      throw error;
    }

    const route = endpoint.routes.find((route) => route.method === httpRequest.method);

    if (typeof route === 'undefined') {
      const error = new MethodNotAllowedError(
        `The Endpoint "${endpoint.path}" does not support the Http Request Method "${httpRequest.method}".`,
      );

      this.logger.error(
        `[${this.constructor.name}] The Endpoint "${endpoint.path}" does not support the Http Request Method "${httpRequest.method}"`,
        '8d47604a-a586-4b71-9ce6-c13cf7dda9df',
        { http_request: httpRequest },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getEndpoint()`, '9a114491-55fa-4229-8def-2121166994e8', {
      http_request: httpRequest,
    });

    return route.handler;
  }

  /**
   * Creates an Identity Provider Http Request from the provided Node Http Request.
   *
   * @param request Node Http Request.
   * @returns Identity Provider Http Request.
   */
  private async createHttpRequest(request: IncomingMessage): Promise<HttpRequest> {
    this.logger.debug(
      `[${this.constructor.name}] Called createHttpRequest()`,
      '9a060507-99c0-420f-a470-58d8ea0a4dde',
      null,
    );

    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      request.on('data', (chunk) => chunks.push(chunk));

      request.on('end', () => {
        try {
          const httpRequest = new HttpRequest({
            body: Buffer.concat(chunks),
            cookies: this.parseRequestCookies(request),
            headers: request.headers,
            method: request.method!.toUpperCase()! as HttpRequestMethod,
            url: new URL(request.url!, this.settings.issuer),
          });

          this.logger.debug(
            `[${this.constructor.name}] Completed createHttpRequest()`,
            'a9146417-8f43-461f-9494-276bae35db48',
            { http_request: httpRequest },
          );

          resolve(httpRequest);
        } catch (error: unknown) {
          this.logger.error(
            `[${this.constructor.name}] Failed to create the Http Request`,
            'b9f9e7c2-a9ca-4999-b36d-e78f14d8c6c7',
            null,
            error as Error,
          );

          reject(error);
        }
      });
    });
  }

  /**
   * Parses the provided Identity Provider Http Response into the provided Node Http Response.
   *
   * @param httpResponse Identity Provider Http Response.
   * @param response Node Http Response.
   */
  private async parseHttpResponse(httpResponse: HttpResponse, response: ServerResponse): Promise<void> {
    response.writeHead(httpResponse.status, {
      ...httpResponse.headers,
      'set-cookie': this.createResponseSetCookie(httpResponse),
    });

    response.end(httpResponse.body);
  }

  private parseRequestCookies(request: IncomingMessage): NodeJS.Dict<unknown> {
    if (typeof request.headers.cookie !== 'string') {
      return {};
    }

    return Object.fromEntries(
      request.headers.cookie
        .split('; ')
        .filter((cookiePair) => cookiePairRegex.test(cookiePair))
        .map<[string, string]>((rawCookie) => rawCookie.split('=') as [string, string]),
    );
  }

  private createResponseSetCookie(httpResponse: HttpResponse): string[] {
    return Object.entries(httpResponse.cookies)
      .map(([name, value]) => {
        if (
          !new RegExp(`^${cookieNameRegex}$`).test(name) ||
          (value !== null && (typeof value !== 'string' || !new RegExp(`^(${cookieValueRegex})$`).test(value)))
        ) {
          return '';
        }

        let setCookie = `${name}=${value ?? ''}; Path=/`;

        if (value === null) {
          setCookie += `; Expires=${new Date(0).toUTCString()}`;
        }

        setCookie += '; HttpOnly';

        if (this.environment === 'production') {
          setCookie += '; Secure';
        }

        return setCookie;
      })
      .filter(isNonEmptyString);
  }
}

const cookieNameRegex = '[^()<>@,;:\\\\"/[\\]?={} \\t\\x00-\\x1f\\x7f]+';
const cookieOctetRegex = '[\\x21\\x23-\\x2b\\x2d-\\x3a\\x3c-\\x5b\\x5d-\\x7e]*';
const cookieValueRegex = `${cookieOctetRegex}|"${cookieOctetRegex}"|(?<!")${cookieOctetRegex}(?!")`;
const cookiePairRegex = new RegExp(`^(${cookieNameRegex})=(${cookieValueRegex})$`);
