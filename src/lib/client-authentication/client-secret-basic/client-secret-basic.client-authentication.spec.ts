import { Buffer } from 'buffer';
import { IncomingHttpHeaders } from 'http';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { ClientSecret } from '../../entities/client-secret';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../http/request/http-request';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ClientAuthenticationName } from '../client-authentication-name.type';
import { ClientSecretBasicClientAuthentication } from './client-secret-basic.client-authentication';

jest.mock('../../logger/logger');

const invalidBasicTokens: string[] = ['Basic', 'Basic '];
const invalidCredentials: string[] = [':', ':client_secret'];

describe('Client Secret Basic Client Authentication', () => {
  let clientAuthentication: ClientSecretBasicClientAuthentication;
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
    container.bind(ClientSecretBasicClientAuthentication).toSelf().asSingleton();

    clientAuthentication = container.resolve(ClientSecretBasicClientAuthentication);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "client_secret_basic" as its value.', () => {
      expect(clientAuthentication.name).toEqual<ClientAuthenticationName>('client_secret_basic');
    });
  });

  describe('hasBeenRequested()', () => {
    const methodRequests: [IncomingHttpHeaders, boolean][] = [
      [{}, false],
      [{ authorization: '' }, false],
      [{ authorization: 'Bearer' }, false],
      [{ authorization: 'Basic' }, true],
      [{ authorization: 'Basic ' }, true],
      [{ authorization: 'Basic $' }, true],
      [{ authorization: 'Basic 123abcDEF+/=' }, true],
    ];

    it.each(methodRequests)(
      'should check if the Client Authentication Method has beed requested.',
      (headers, expected) => {
        const request = new HttpRequest({
          body: Buffer.alloc(0),
          cookies: {},
          headers,
          method: 'POST',
          url: new URL('https://idp.example.com/oidc/token'),
        });

        expect(clientAuthentication.hasBeenRequested(request)).toEqual(expected);
      },
    );
  });

  describe('getClient()', () => {
    let request: HttpRequest;

    beforeEach(() => {
      request = new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: { authorization: 'Basic ' + Buffer.from('client_id:client_secret', 'utf8').toString('base64') },
        method: 'POST',
        url: new URL('https://idp.example.com/oidc/token'),
      });
    });

    it.each(invalidBasicTokens)('should throw when the provided Basic Token is invalid.', async (token) => {
      request.headers.authorization = `Basic${token}`;

      const error = new InvalidRequestError('The Client provided an invalid Basic Token.').setHttpHeaders({
        'www-authenticate': 'Basic',
      });

      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidRequestError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretBasicClientAuthentication] The Client provided an invalid Basic Token',
        '0d7ac651-42f7-48c6-adf9-e6dae4bb67f6',
        { request },
        error,
      );
    });

    it('should throw when the provided Basic Token is not a Base64 string.', async () => {
      request.headers.authorization = 'Basic $';

      const error = new InvalidRequestError('The Client provided an invalid Base64 Basic Token.').setHttpHeaders({
        'www-authenticate': 'Basic',
      });

      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidRequestError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretBasicClientAuthentication] The Client provided an invalid Base64 Basic Token',
        '73a5fda0-9fde-4691-a7ac-e8cd8e8955ae',
        { request },
        error,
      );
    });

    it('should throw when the provided Basic Token does not have a semicolon.', async () => {
      request.headers.authorization = `Basic ${Buffer.from('foobar', 'utf8').toString('base64')}`;

      const error = new InvalidRequestError('The Client provided invalid Basic Token Credentials.').setHttpHeaders({
        'www-authenticate': 'Basic',
      });

      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidRequestError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretBasicClientAuthentication] The Client provided invalid Basic Token Credentials',
        'b3dc9148-eaad-468d-b9a5-706f8933dc31',
        { request },
        error,
      );
    });

    it.each(invalidCredentials)(
      'should throw when the provided Basic Token does not have a Client Identifier.',
      async (credentials) => {
        request.headers.authorization = `Basic ${Buffer.from(credentials, 'utf8').toString('base64')}`;

        const error = new InvalidRequestError('The Client did not provide a Client Identifier.').setHttpHeaders({
          'www-authenticate': 'Basic',
        });

        await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
          InvalidRequestError,
          error.message,
        );

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ClientSecretBasicClientAuthentication] The Client did not provide a Client Identifier',
          '7bcee623-ce9b-456c-a4c3-608494b4ccb4',
          { request },
          error,
        );
      },
    );

    it('should throw when the provided Basic Token does not have a Client Secret.', async () => {
      request.headers.authorization = `Basic ${Buffer.from('client_id:', 'utf8').toString('base64')}`;

      const error = new InvalidRequestError('The Client did not provide a Client Secret.').setHttpHeaders({
        'www-authenticate': 'Basic',
      });

      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidRequestError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretBasicClientAuthentication] The Client did not provide a Client Secret',
        '73c5d63d-6969-4b25-94a9-2487d2f913ab',
        { request },
        error,
      );
    });

    it('should throw when no Client is found.', async () => {
      dataAccessMock.findClientById.mockResolvedValueOnce(null);

      const error = new InvalidClientError('Failed to authenticate the Client.').setHttpHeaders({
        'www-authenticate': 'Basic',
      });

      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretBasicClientAuthentication] Could not find a Client with the provided Identifier',
        'abe3e437-fd1c-467e-a0be-56a56ae23cf1',
        { request },
        error,
      );
    });

    it('should throw when the Client has no Secret.', async () => {
      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'client_id',
        secrets: [],
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      const error = new InvalidClientError('Failed to authenticate the Client.').setHttpHeaders({
        'www-authenticate': 'Basic',
      });

      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretBasicClientAuthentication] The Client is not allowed to use the provided Secret',
        'e1da0e7e-3c1f-4c35-9176-a8e81f766389',
        { request },
        error,
      );
    });

    it('should throw when the provided Client Secret has a different length than expected.', async () => {
      const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(
        Reflect.construct(ClientSecret, []),
        { secret: 'another_client_secret' },
      );

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'client_id',
        secrets: [secret],
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      const error = new InvalidClientError('Failed to authenticate the Client.').setHttpHeaders({
        'www-authenticate': 'Basic',
      });

      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretBasicClientAuthentication] The Client is not allowed to use the provided Secret',
        'e1da0e7e-3c1f-4c35-9176-a8e81f766389',
        { request },
        error,
      );
    });

    it('should throw when the provided Client Secret is not valid for the Client.', async () => {
      const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(
        Reflect.construct(ClientSecret, []),
        { secret: 'secret_client' },
      );

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'client_id',
        secrets: [secret],
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      const error = new InvalidClientError('Failed to authenticate the Client.').setHttpHeaders({
        'www-authenticate': 'Basic',
      });

      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretBasicClientAuthentication] The Client is not allowed to use the provided Secret',
        'e1da0e7e-3c1f-4c35-9176-a8e81f766389',
        { request },
        error,
      );
    });

    it('should throw when the provided Client Secret is expired.', async () => {
      const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(
        Reflect.construct(ClientSecret, []),
        { secret: 'client_secret', expiresAt: new Date(Date.now() - 3600000) },
      );

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'client_id',
        secrets: [secret],
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      const error = new InvalidClientError('Failed to authenticate the Client.').setHttpHeaders({
        'www-authenticate': 'Basic',
      });

      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretBasicClientAuthentication] The Client Secret is expired',
        '7acc557d-c955-4beb-abac-a8e3b9b2c580',
        { request },
        error,
      );
    });

    it('should throw when the Client is not allowed to use this Client Authentication Method.', async () => {
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

      const error = new InvalidClientError('Failed to authenticate the Client.').setHttpHeaders({
        'www-authenticate': 'Basic',
      });

      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientSecretBasicClientAuthentication] The Client is not allowed to use the Authentication Method "client_secret_basic"',
        'd1434c29-e2ff-4d65-8af6-3c52e7ccbe32',
        { request },
        error,
      );
    });

    it('should return the Client based on the provided Client Identifier.', async () => {
      const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(
        Reflect.construct(ClientSecret, []),
        { secret: 'client_secret', expiresAt: new Date(Date.now() + 3600000) },
      );

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'client_id',
        secrets: [secret],
        authenticationMethod: 'client_secret_basic',
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      await expect(clientAuthentication.getClient(request)).resolves.toStrictEqual(client);
    });
  });
});
