import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { Endpoint } from '../endpoints/endpoint';
import { EndpointName } from '../endpoints/endpoint-name.type';
import { HttpRequest } from '../http/request/http-request';
import { HttpResponse } from '../http/response/http-response';
import { Logger } from '../logger/logger';

/**
 * Base class for the Identity Provider.
 */
@Injectable()
export class IdentityProvider {
  /**
   * Instantiates a new Identity Provider.
   *
   * @param logger Logger of the Identity Provider.
   * @param endpoints Endpoints of the Identity Provider.
   */
  public constructor(
    protected readonly logger: Logger,
    @InjectAll(Endpoint) protected readonly endpoints: Endpoint[],
  ) {}

  /**
   * Creates an Http Response for the requested Endpoint.
   *
   * @param name Name of the Endpoint.
   * @param request Http Request.
   * @throws {TypeError} One of the provided arguments is invalid.
   * @returns Http Response.
   */
  public async endpoint(name: EndpointName, request: HttpRequest): Promise<HttpResponse> {
    this.logger.debug(`[${this.constructor.name}] Called endpoint()`, '05956a82-c04f-4b88-92b6-ca49c81b1277', {
      name,
      request,
    });

    if (!isNonEmptyString(name)) {
      const error = new TypeError('The provided Endpoint Name is invalid.');

      this.logger.critical(
        `[${this.constructor.name}] The provided Endpoint Name is invalid`,
        '1c45b09f-96f6-4645-b8d5-4ee87380d6c5',
        { name, request },
        error,
      );

      throw error;
    }

    if (!(request instanceof HttpRequest)) {
      const error = new TypeError('The provided Http Request is invalid.');

      this.logger.critical(
        `[${this.constructor.name}] The provided Http Request is invalid`,
        'd12e4ead-fe7f-4b5e-b7d5-a5c17626a014',
        { name, request },
        error,
      );

      throw error;
    }

    const endpoint = this.endpoints.find((endpoint) => endpoint.name === name);

    if (!(endpoint instanceof Endpoint)) {
      const error = new TypeError(`Unsupported Endpoint "${name}".`);

      this.logger.critical(
        `[${this.constructor.name}] Unsupported Endpoint "${name}"`,
        '786373a1-ecd1-4dd8-912b-865d4d262d60',
        { name, request },
        error,
      );

      throw error;
    }

    const response = await endpoint.handle(request);

    this.logger.debug(`[${this.constructor.name}] Completed endpoint()`, '6e3547aa-907d-459a-a509-caca41d20e7f', {
      name,
      request,
      response,
    });

    return response;
  }
}
