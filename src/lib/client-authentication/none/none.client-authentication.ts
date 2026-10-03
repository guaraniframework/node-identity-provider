import { Injectable } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../http/request/http-request';
import { Logger } from '../../logger/logger';
import { ClientAuthentication } from '../client-authentication';
import { ClientAuthenticationName } from '../client-authentication-name.type';
import { NoneClientAuthenticationParameters } from './none.client-authentication.parameters';

/**
 * Implementation of the Client Authentication via the Request Body.
 *
 * If this workflow is enabled, it will look at the Request Body for a scheme similar to the following:
 *
 * ```
 *     client_id=client1
 * ```
 *
 * The Request Body often comes with more information that may pertain to a specific Endpoint or Authorization Grant.
 * In this case, the Request Body will be similar to the following:
 *
 * ```
 *     key1=value1&key2=value2&client_id=client1
 * ```
 *
 * In this workflow, if the Client provides a Secret, it will automatically fail,
 * since it is intended to be used by Public Clients.
 */
@Injectable()
export class NoneClientAuthentication extends ClientAuthentication {
  /**
   * Name of the Client Authentication Method.
   */
  public readonly name: ClientAuthenticationName = 'none';

  /**
   * Instantiates a new None Client Authentication Method.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
  ) {
    super();
  }

  /**
   * Checks if the Client Authentication Method has been requested by the Client.
   *
   * @param request Http Request.
   * @returns Whether or not the Client Authentication Method has been requested.
   */
  public hasBeenRequested(request: HttpRequest): boolean {
    this.logger.debug(`[${this.constructor.name}] Called hasBeenRequested()`, '20f8b03e-bd38-4bdc-85a4-b5c5cfeb5e56', {
      request,
    });

    const parameters = request.form<NoneClientAuthenticationParameters>();

    const result = 'client_id' in parameters && !('client_secret' in parameters);

    this.logger.debug(
      `[${this.constructor.name}] Completed hasBeenRequested()`,
      '1b82bb4b-b68d-468f-99e8-07200673fb89',
      { request, result },
    );

    return result;
  }

  /**
   * Authenticates and returns the Client of the Request.
   *
   * @param request Http Request.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @throws {InvalidClientError} Failed to authenticate the Client.
   * @returns Authenticated Client.
   */
  public async getClient(request: HttpRequest): Promise<Client> {
    this.logger.debug(`[${this.constructor.name}] Called getClient()`, 'f8dceb10-8e36-469f-86d6-b91b18023f49', {
      request,
    });

    const { client_id: clientId } = request.form<NoneClientAuthenticationParameters>();

    if (!isNonEmptyString(clientId)) {
      const error = new InvalidRequestError('Invalid parameter "client_id".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "client_id"`,
        '28054030-e27b-48fd-9d86-cad2702306d8',
        { request },
        error,
      );

      throw error;
    }

    const client = await this.dataAccess.findClientById(clientId);

    if (!(client instanceof Client)) {
      const error = new InvalidClientError('Failed to authenticate the Client.');

      this.logger.error(
        `[${this.constructor.name}] Could not find a Client with the provided Identifier`,
        '46aed74d-4cd1-413b-9e2d-f8df273612ce',
        { request },
        error,
      );

      throw error;
    }

    if (client.secrets.length !== 0) {
      const error = new InvalidClientError('Failed to authenticate the Client.');

      this.logger.error(
        `[${this.constructor.name}] The Client has a Secret`,
        'fdceadbc-efe2-4753-ac82-dc8667b5435d',
        { request },
        error,
      );

      throw error;
    }

    if (client.authenticationMethod !== this.name) {
      const error = new InvalidClientError('Failed to authenticate the Client.');

      this.logger.error(
        `[${this.constructor.name}] The Client is not allowed to use the Authentication Method "${this.name}"`,
        '9234e12f-1aa5-46d0-9bb7-4c3bcc0043cb',
        { request },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed authenticate()`, '84f8bbe4-6691-4158-a6bc-bde45ac4775e', {
      request,
      client,
    });

    return client;
  }
}
