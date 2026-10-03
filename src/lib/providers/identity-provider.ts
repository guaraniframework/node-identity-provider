import { IncomingMessage, ServerResponse } from 'http';

import { Endpoint } from '../endpoints/endpoint';
import { HttpRequest } from '../http/request/http-request';
import { HttpResponse } from '../http/response/http-response';
import { Logger } from '../logger/logger';

/**
 * Base class for the Identity Provider.
 */
export abstract class IdentityProvider {
  /**
   * Instantiates a new Identity Provider.
   *
   * @param logger Logger of the Identity Provider.
   * @param endpoints Endpoints of the Identity Provider.
   */
  public constructor(
    protected readonly logger: Logger,
    protected readonly endpoints: Endpoint[],
  ) {}

  /**
   * Handler used to route the Http Request to the respective Endpoint.
   *
   * @param request Http Incoming Message.
   * @param response Http Server Response.
   */
  public async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '05956a82-c04f-4b88-92b6-ca49c81b1277');

    const httpRequest = this.createHttpRequest(request);
    const endpoint = this.endpoints.find((endpoint) => endpoint.path === httpRequest.path);

    if (!(endpoint instanceof Endpoint)) {
      this.logger.debug(
        `[${this.constructor.name}] Endpoint "${httpRequest.path}" not found`,
        '786373a1-ecd1-4dd8-912b-865d4d262d60',
      );

      response.writeHead(404).end();
      return;
    }

    if (!endpoint.httpMethods.includes(httpRequest.method)) {
      this.logger.debug(
        `[${this.constructor.name}] The Endpoint "${httpRequest.path}" does not support the Http Request Method "${httpRequest.method}"`,
        '8d47604a-a586-4b71-9ce6-c13cf7dda9df',
      );

      response.writeHead(405).end();
      return;
    }

    const httpResponse = await endpoint.handle(httpRequest);
    this.parseHttpResponse(httpResponse, response);

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, '6e3547aa-907d-459a-a509-caca41d20e7f');
  }

  /**
   * Creates an Identity Provider Http Request from the provided NodeJS Http Request.
   *
   * @param request NodeJS Http Request.
   * @returns Identity Provider Http Request.
   */
  protected abstract createHttpRequest(request: IncomingMessage): HttpRequest;

  /**
   * Parses the provided Identity Provider Http Response into the provided NodeJS Http Response.
   *
   * @param httpResponse Identity Provider Http Response.
   * @param response NodeJS Http Response.
   */
  protected abstract parseHttpResponse(httpResponse: HttpResponse, response: ServerResponse): void;
}
