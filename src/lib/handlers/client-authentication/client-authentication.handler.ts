import { Injectable } from '@guarani/di';

import { ClientAuthentication } from '../../client-authentication/client-authentication';
import { Client } from '../../entities/client';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { HttpRequest } from '../../http/request/http-request';
import { Logger } from '../../loggers/logger';

/**
 * Handler used to authenticate the Client of the Request.
 */
@Injectable()
export class ClientAuthenticationHandler {
  /**
   * Instantiates a new Client Authentication Handler.
   *
   * @param logger Logger of the Identity Provider.
   */
  public constructor(private readonly logger: Logger) {}

  /**
   * Authenticates the Client based on the Client Authentication Methods supported by the Identity Provider Endpoint.
   *
   * @param request Http Request.
   * @param clientAuthenticationMethods Client Authentication Methods of the Endpoint.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @throws {InvalidClientError} Failed to authenticate the Client.
   * @returns Authenticated Client.
   */
  public async authenticate(
    request: HttpRequest,
    clientAuthenticationMethods: ClientAuthentication[],
  ): Promise<Client> {
    const methodsNames = clientAuthenticationMethods.map((method) => method.name);

    this.logger.debug(`[${this.constructor.name}] Called authenticate()`, '805321cd-d92f-4b94-aafb-ed1a751dc765', {
      request,
      methods: methodsNames,
    });

    const methods = clientAuthenticationMethods.filter((method) => method.hasBeenRequested(request));

    if (methods.length === 0) {
      const error = new InvalidClientError('No Client Authentication Method detected.');

      this.logger.error(
        `[${this.constructor.name}] No Client Authentication Method detected`,
        'be28dc5f-535a-4808-89fe-99781e4795da',
        { request, methods: methodsNames },
        error,
      );

      throw error;
    }

    if (methods.length > 1) {
      const error = new InvalidClientError('Multiple Client Authentication Methods detected.');

      this.logger.error(
        `[${this.constructor.name}] Multiple Client Authentication Methods detected`,
        '9581a0f0-00c2-4bff-bae0-cdf2d39f5721',
        { request, methods: methodsNames },
        error,
      );

      throw error;
    }

    const [method] = methods;
    const client = await method!.getClient(request);

    this.logger.debug(`[${this.constructor.name}] Completed authenticate()`, 'bd5470d3-7477-4fa5-a577-d939e8dd90da', {
      request,
      methods: methodsNames,
      client_id: client.id,
    });

    return client;
  }
}
