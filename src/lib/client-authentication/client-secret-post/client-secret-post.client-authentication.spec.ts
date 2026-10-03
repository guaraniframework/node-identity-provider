import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { ClientSecret } from '../../entities/client-secret';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../http/request/http-request';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ClientAuthenticationName } from '../client-authentication-name.type';
import { ClientSecretPostClientAuthentication } from './client-secret-post.client-authentication';
import { ClientSecretPostClientAuthenticationParameters } from './client-secret-post.client-authentication.parameters';

jest.mock('../../logger/logger');

const invalidClientIds: any[] = [undefined, ''];
const invalidClientSecrets: any[] = [undefined, ''];

describe('Client Secret Post Client Authentication', () => {
  let clientAuthentication: ClientSecretPostClientAuthentication;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findClientById: jest.fn(),
    }),
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ClientSecretPostClientAuthentication).toSelf().asSingleton();

    clientAuthentication = container.resolve(ClientSecretPostClientAuthentication);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "client_secret_post" as its value.', () => {
      expect(clientAuthentication.name).toEqual<ClientAuthenticationName>('client_secret_post');
    });
  });

  describe('hasBeenRequested()', () => {
    const methodRequests: [NodeJS.Dict<string>, boolean][] = [
      [{}, false],
      [{ client_id: '' }, false],
      [{ client_id: 'foo' }, false],
      [{ client_secret: '' }, false],
      [{ client_secret: 'bar' }, false],
      [{ client_id: '', client_secret: '' }, true],
      [{ client_id: 'foo', client_secret: '' }, true],
      [{ client_id: '', client_secret: 'bar' }, true],
      [{ client_id: 'foo', client_secret: 'bar' }, true],
    ];

    it.each(methodRequests)(
      'should check if the Client Authentication Method has beed requested.',
      (body, expected) => {
        const request = new HttpRequest({
          body: Buffer.from(stringifyQs(body), 'utf8'),
          cookies: {},
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          method: 'POST',
          url: new URL('https://idp.example.com/oidc/token'),
        });

        expect(clientAuthentication.hasBeenRequested(request)).toEqual(expected);
      },
    );
  });

  describe('getClient()', () => {
    let parameters: ClientSecretPostClientAuthenticationParameters;

    const requestFactory = (data: Partial<ClientSecretPostClientAuthenticationParameters> = {}): HttpRequest => {
      removeNullishValues<ClientSecretPostClientAuthenticationParameters>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
        url: new URL('https://idp.example.com/oidc/token'),
      });
    };

    beforeEach(() => {
      parameters = { client_id: 'client_id', client_secret: 'client_secret' };
    });

    it.each(invalidClientIds)('should throw when the provided parameter "client_id" is invalid.', async (clientId) => {
      const request = requestFactory({ client_id: clientId });

      const error = new InvalidRequestError('Invalid parameter "client_id".');

      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidRequestError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretPostClientAuthentication] Invalid parameter "client_id"',
        'a0fcf540-63cc-405f-a292-a6da349e4c4f',
        { request },
        error,
      );
    });

    it.each(invalidClientSecrets)(
      'should throw when the provided parameter "client_secret" is invalid.',
      async (clientSecret) => {
        const request = requestFactory({ client_secret: clientSecret });

        const error = new InvalidRequestError('Invalid parameter "client_secret".');

        await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
          InvalidRequestError,
          error.message,
        );

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ClientSecretPostClientAuthentication] Invalid parameter "client_secret"',
          '514646fd-c7d1-47ca-a904-a1b742fb5e85',
          { request },
          error,
        );
      },
    );

    it('should throw when no Client is found.', async () => {
      const request = requestFactory();

      dataAccessMock.findClientById.mockResolvedValueOnce(null);

      const error = new InvalidClientError('Failed to authenticate the Client.');
      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretPostClientAuthentication] Could not find a Client with the provided Identifier',
        '69d39def-338e-485f-aac1-a5aebc59492b',
        { request },
        error,
      );
    });

    it('should throw when the Client has no Secret.', async () => {
      const request = requestFactory();

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'client_id',
        secrets: [],
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      const error = new InvalidClientError('Failed to authenticate the Client.');
      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretPostClientAuthentication] The Client is not allowed to use the provided Secret',
        'ee6ac42e-5a45-4aa0-be45-9cd79090db9c',
        { request },
        error,
      );
    });

    it('should throw when the provided Client Secret has a different length than expected.', async () => {
      const request = requestFactory();

      const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(
        Reflect.construct(ClientSecret, []),
        { secret: 'another_client_secret' },
      );

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'client_id',
        secrets: [secret],
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      const error = new InvalidClientError('Failed to authenticate the Client.');
      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretPostClientAuthentication] The Client is not allowed to use the provided Secret',
        'ee6ac42e-5a45-4aa0-be45-9cd79090db9c',
        { request },
        error,
      );
    });

    it('should throw when the provided Client Secret is not valid for the Client.', async () => {
      const request = requestFactory();

      const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(
        Reflect.construct(ClientSecret, []),
        { secret: 'secret_client' },
      );

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'client_id',
        secrets: [secret],
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      const error = new InvalidClientError('Failed to authenticate the Client.');
      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretPostClientAuthentication] The Client is not allowed to use the provided Secret',
        'ee6ac42e-5a45-4aa0-be45-9cd79090db9c',
        { request },
        error,
      );
    });

    it('should throw when the provided Client Secret is expired.', async () => {
      const request = requestFactory();

      const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(
        Reflect.construct(ClientSecret, []),
        { secret: 'client_secret', expiresAt: new Date(Date.now() - 3600000) },
      );

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'client_id',
        secrets: [secret],
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      const error = new InvalidClientError('Failed to authenticate the Client.');
      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretPostClientAuthentication] The Client Secret is expired',
        'bd8f614e-9bee-4838-99c5-1c6b4e3ff4e8',
        { request },
        error,
      );
    });

    it('should throw when the Client is not allowed to use this Client Authentication Method.', async () => {
      const request = requestFactory();

      const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(
        Reflect.construct(ClientSecret, []),
        { secret: 'client_secret', expiresAt: new Date(Date.now() + 3600000) },
      );

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'client_id',
        secrets: [secret],
        authenticationMethod: 'none',
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      const error = new InvalidClientError('Failed to authenticate the Client.');
      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretPostClientAuthentication] The Client is not allowed to use the Authentication Method "client_secret_post"',
        'ed422022-672b-475d-a939-d00a9f16ebaf',
        { request },
        error,
      );
    });

    it('should return the Client based on the provided Client Identifier.', async () => {
      const request = requestFactory();

      const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(
        Reflect.construct(ClientSecret, []),
        { secret: 'client_secret', expiresAt: new Date(Date.now() + 3600000) },
      );

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'client_id',
        secrets: [secret],
        authenticationMethod: 'client_secret_post',
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      await expect(clientAuthentication.getClient(request)).resolves.toStrictEqual(client);
    });
  });
});
