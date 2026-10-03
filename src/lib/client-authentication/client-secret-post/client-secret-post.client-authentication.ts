import { Injectable } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { ClientSecret } from '../../entities/client-secret';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../http/request/http-request';
import { Logger } from '../../logger/logger';
import { findClientSecret } from '../../utils/find-client-secret/find-client-secret';
import { ClientAuthentication } from '../client-authentication';
import { ClientAuthenticationName } from '../client-authentication-name.type';
import { ClientSecretPostClientAuthenticationParameters } from './client-secret-post.client-authentication.parameters';

/**
 * Implementation of the Client Authentication via the Request Body.
 *
 * If this workflow is enabled, it will look at the Request Body for a scheme similar to the following:
 *
 * ```
 *     client_id=client1&client_secret=client1secret
 * ```
 *
 * The Request Body often comes with more information that may pertain to a specific Endpoint or Authorization Grant.
 * In this case, the Request Body will be similar to the following:
 *
 * ```
 *     key1=value1&key2=value2&client_id=client1&client_secret=client1secret
 * ```
 */
@Injectable()
export class ClientSecretPostClientAuthentication extends ClientAuthentication {
  /**
   * Name of the Client Authentication Method.
   */
  public readonly name: ClientAuthenticationName = 'client_secret_post';

  /**
   * Instantiates a new Client Secret Post Client Authentication Method.
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
    this.logger.debug(`[${this.constructor.name}] Called hasBeenRequested()`, 'c781b93e-500d-4bce-9cf4-45d5524f0e07', {
      request,
    });

    const parameters = request.form<ClientSecretPostClientAuthenticationParameters>();

    const result = 'client_id' in parameters && 'client_secret' in parameters;

    this.logger.debug(
      `[${this.constructor.name}] Completed hasBeenRequested()`,
      'd3d43217-377a-4eef-b129-80447667db52',
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
    this.logger.debug(`[${this.constructor.name}] Called getClient()`, '5e1d39ce-1d62-43f3-960f-37384b5467a6', {
      request,
    });

    const { client_id: clientId, client_secret: clientSecret } =
      request.form<ClientSecretPostClientAuthenticationParameters>();

    if (!isNonEmptyString(clientId)) {
      const error = new InvalidRequestError('Invalid parameter "client_id".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "client_id"`,
        'a0fcf540-63cc-405f-a292-a6da349e4c4f',
        { request },
        error,
      );

      throw error;
    }

    if (!isNonEmptyString(clientSecret)) {
      const error = new InvalidRequestError('Invalid parameter "client_secret".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "client_secret"`,
        '514646fd-c7d1-47ca-a904-a1b742fb5e85',
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
        '69d39def-338e-485f-aac1-a5aebc59492b',
        { request },
        error,
      );

      throw error;
    }

    const secret = findClientSecret(client, clientSecret);

    if (!(secret instanceof ClientSecret)) {
      const error = new InvalidClientError('Failed to authenticate the Client.');

      this.logger.error(
        `[${this.constructor.name}] The Client is not allowed to use the provided Secret`,
        'ee6ac42e-5a45-4aa0-be45-9cd79090db9c',
        { request },
        error,
      );

      throw error;
    }

    if (new Date() > secret.expiresAt) {
      const error = new InvalidClientError('Failed to authenticate the Client.');

      this.logger.error(
        `[${this.constructor.name}] The Client Secret is expired`,
        'bd8f614e-9bee-4838-99c5-1c6b4e3ff4e8',
        { request },
        error,
      );

      throw error;
    }

    if (client.authenticationMethod !== this.name) {
      const error = new InvalidClientError('Failed to authenticate the Client.');

      this.logger.error(
        `[${this.constructor.name}] The Client is not allowed to use the Authentication Method "${this.name}"`,
        'ed422022-672b-475d-a939-d00a9f16ebaf',
        { request },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed authenticate()`, 'bed88bc9-e88c-40b4-aa44-5b10608897f0', {
      request,
      client,
    });

    return client;
  }
}
