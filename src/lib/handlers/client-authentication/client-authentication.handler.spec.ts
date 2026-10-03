import { Buffer } from 'buffer';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { ClientAuthentication } from '../../client-authentication/client-authentication';
import { Client } from '../../entities/client';
import { ClientSecret } from '../../entities/client-secret';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { HttpRequest } from '../../http/request/http-request';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ClientAuthenticationHandler } from './client-authentication.handler';

jest.mock('../../logger/logger');

describe('Client Authentication Handler', () => {
  let handler: ClientAuthenticationHandler;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const clientAuthenticationMethodsMocks = [
    jest.mocked<ClientAuthentication>({
      name: 'client_secret_basic',
      hasBeenRequested: jest.fn(),
      getClient: jest.fn(),
    }),
    jest.mocked<ClientAuthentication>({
      name: 'client_secret_post',
      hasBeenRequested: jest.fn(),
      getClient: jest.fn(),
    }),
    jest.mocked<ClientAuthentication>({
      name: 'none',
      hasBeenRequested: jest.fn(),
      getClient: jest.fn(),
    }),
  ];

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);

    clientAuthenticationMethodsMocks.forEach((clientAuthentication) => {
      container.bind(ClientAuthentication).toValue(clientAuthentication);
    });

    container.bind(ClientAuthenticationHandler).toSelf().asSingleton();

    handler = container.resolve(ClientAuthenticationHandler);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('authenticate()', () => {
    let request: HttpRequest;

    beforeEach(() => {
      request = new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: 'POST',
        url: new URL('https://idp.example.com/oidc/token'),
      });
    });

    it('should throw when not using a Client Authentication Method.', async () => {
      clientAuthenticationMethodsMocks.forEach((method) => method.hasBeenRequested.mockReturnValueOnce(false));

      const error = new InvalidClientError('No Client Authentication Method detected.');
      await expect(handler.authenticate(request)).rejects.toThrowWithMessage(InvalidClientError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientAuthenticationHandler] No Client Authentication Method detected',
        'be28dc5f-535a-4808-89fe-99781e4795da',
        { request },
        error,
      );
    });

    it('should throw when using multiple Client Authentication Methods.', async () => {
      clientAuthenticationMethodsMocks.forEach((method) => method.hasBeenRequested.mockReturnValueOnce(true));

      const error = new InvalidClientError('Multiple Client Authentication Methods detected.');
      await expect(handler.authenticate(request)).rejects.toThrowWithMessage(InvalidClientError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ClientAuthenticationHandler] Multiple Client Authentication Methods detected',
        '9581a0f0-00c2-4bff-bae0-cdf2d39f5721',
        { request },
        error,
      );
    });

    it('should return an authenticated client.', async () => {
      const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(
        Reflect.construct(ClientSecret, []),
        { secret: 'client_secret' },
      );

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'client_id',
        secrets: [secret],
        authenticationMethod: 'client_secret_basic',
      });

      clientAuthenticationMethodsMocks[0]!.hasBeenRequested.mockReturnValueOnce(true);
      clientAuthenticationMethodsMocks[0]!.getClient.mockResolvedValueOnce(client);

      await expect(handler.authenticate(request)).resolves.toStrictEqual(client);
    });
  });
});
