import { Buffer } from 'buffer';
import { OutgoingHttpHeaders } from 'http';

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

/**
 * Implementation of the Client Authentication via the Basic Authorization Header.
 *
 * If this workflow is enabled, it will look at the Authorization header for a scheme similar to the following:
 *
 * ```
 *     Basic Y2xpZW50X2lkOmNsaWVudF9zZWNyZXQ=
 * ```
 *
 * This scheme denotes the type of the flow, which in this case is **Basic**, and the Client Credentials,
 * a Base64 Encoded String that contains the Client Credentials in the format `client_id:client_secret`.
 */
@Injectable()
export class ClientSecretBasicClientAuthentication extends ClientAuthentication {
  /**
   * Name of the Client Authentication Method.
   */
  public readonly name: ClientAuthenticationName = 'client_secret_basic';

  /**
   * Defines the `WWW-Authenticate` Http Header in case of Client Authentication failure.
   */
  private readonly headers: OutgoingHttpHeaders = { 'www-authenticate': 'Basic' };

  /**
   * Instantiates a new Client Secret Basic Client Authentication Method.
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
    this.logger.debug(`[${this.constructor.name}] Called hasBeenRequested()`, '3937a690-6e6d-4c45-bce0-4ed1585e5714', {
      request,
    });

    const result = request.headers.authorization?.startsWith('Basic') === true;

    this.logger.debug(
      `[${this.constructor.name}] Completed hasBeenRequested()`,
      '82d5b037-4d5f-4d90-ab5a-37c048ebaa70',
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
    this.logger.debug(`[${this.constructor.name}] Called getClient()`, 'a2db6155-7c33-467a-a4f3-ed054a102a66', {
      request,
    });

    const [, base64urlCredentials] = request.headers.authorization!.split(' ', 2);

    if (!isNonEmptyString(base64urlCredentials)) {
      const error = new InvalidRequestError('The Client provided an invalid Basic Token.').setHttpHeaders(this.headers);

      this.logger.error(
        `[${this.constructor.name}] The Client provided an invalid Basic Token`,
        '0d7ac651-42f7-48c6-adf9-e6dae4bb67f6',
        { request },
        error,
      );

      throw error;
    }

    if (Buffer.from(base64urlCredentials, 'base64').toString('base64') !== base64urlCredentials) {
      const error = new InvalidRequestError('The Client provided an invalid Base64 Basic Token.').setHttpHeaders(
        this.headers,
      );

      this.logger.error(
        `[${this.constructor.name}] The Client provided an invalid Base64 Basic Token`,
        '73a5fda0-9fde-4691-a7ac-e8cd8e8955ae',
        { request },
        error,
      );

      throw error;
    }

    const credentials = Buffer.from(base64urlCredentials, 'base64').toString('utf8');

    if (!credentials.includes(':')) {
      const error = new InvalidRequestError('The Client provided invalid Basic Token Credentials.').setHttpHeaders(
        this.headers,
      );

      this.logger.error(
        `[${this.constructor.name}] The Client provided invalid Basic Token Credentials`,
        'b3dc9148-eaad-468d-b9a5-706f8933dc31',
        { request },
        error,
      );

      throw error;
    }

    const [clientId, clientSecret] = credentials.split(':', 2);

    if (!isNonEmptyString(clientId)) {
      const error = new InvalidRequestError('The Client did not provide a Client Identifier.').setHttpHeaders(
        this.headers,
      );

      this.logger.error(
        `[${this.constructor.name}] The Client did not provide a Client Identifier`,
        '7bcee623-ce9b-456c-a4c3-608494b4ccb4',
        { request },
        error,
      );

      throw error;
    }

    if (!isNonEmptyString(clientSecret)) {
      const error = new InvalidRequestError('The Client did not provide a Client Secret.').setHttpHeaders(this.headers);

      this.logger.error(
        `[${this.constructor.name}] The Client did not provide a Client Secret`,
        '73c5d63d-6969-4b25-94a9-2487d2f913ab',
        { request },
        error,
      );

      throw error;
    }

    const client = await this.dataAccess.findClientById(clientId);

    if (!(client instanceof Client)) {
      const error = new InvalidClientError('Failed to authenticate the Client.').setHttpHeaders(this.headers);

      this.logger.error(
        `[${this.constructor.name}] Could not find a Client with the provided Identifier`,
        'abe3e437-fd1c-467e-a0be-56a56ae23cf1',
        { request },
        error,
      );

      throw error;
    }

    const secret = findClientSecret(client, clientSecret);

    if (!(secret instanceof ClientSecret)) {
      const error = new InvalidClientError('Failed to authenticate the Client.').setHttpHeaders(this.headers);

      this.logger.error(
        `[${this.constructor.name}] The Client is not allowed to use the provided Secret`,
        'e1da0e7e-3c1f-4c35-9176-a8e81f766389',
        { request },
        error,
      );

      throw error;
    }

    if (new Date() > secret.expiresAt) {
      const error = new InvalidClientError('Failed to authenticate the Client.').setHttpHeaders(this.headers);

      this.logger.error(
        `[${this.constructor.name}] The Client Secret is expired`,
        '7acc557d-c955-4beb-abac-a8e3b9b2c580',
        { request },
        error,
      );

      throw error;
    }

    if (client.authenticationMethod !== this.name) {
      const error = new InvalidClientError('Failed to authenticate the Client.').setHttpHeaders(this.headers);

      this.logger.error(
        `[${this.constructor.name}] The Client is not allowed to use the Authentication Method "${this.name}"`,
        'd1434c29-e2ff-4d65-8af6-3c52e7ccbe32',
        { request },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed authenticate()`, '7776d17f-926e-4e29-be9c-ad3484ec961b', {
      request,
      client,
    });

    return client;
  }
}
