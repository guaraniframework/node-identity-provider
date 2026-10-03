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
import { NoneClientAuthentication } from './none.client-authentication';
import { NoneClientAuthenticationParameters } from './none.client-authentication.parameters';

jest.mock('../../logger/logger');

const invalidClientIds: any[] = [undefined, ''];

describe('Client Secret Post Client Authentication', () => {
  let clientAuthentication: NoneClientAuthentication;
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
    container.bind(NoneClientAuthentication).toSelf().asSingleton();

    clientAuthentication = container.resolve(NoneClientAuthentication);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "none" as its value.', () => {
      expect(clientAuthentication.name).toEqual<ClientAuthenticationName>('none');
    });
  });

  describe('hasBeenRequested()', () => {
    const methodRequests: [NodeJS.Dict<string>, boolean][] = [
      [{}, false],
      [{ client_id: '' }, true],
      [{ client_id: 'foo' }, true],
      [{ client_secret: '' }, false],
      [{ client_secret: 'bar' }, false],
      [{ client_id: '', client_secret: '' }, false],
      [{ client_id: 'foo', client_secret: '' }, false],
      [{ client_id: '', client_secret: 'bar' }, false],
      [{ client_id: 'foo', client_secret: 'bar' }, false],
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
    let parameters: NoneClientAuthenticationParameters;

    const requestFactory = (data: Partial<NoneClientAuthenticationParameters> = {}): HttpRequest => {
      removeNullishValues<NoneClientAuthenticationParameters>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
        url: new URL('https://idp.example.com/oidc/token'),
      });
    };

    beforeEach(() => {
      parameters = { client_id: 'client_id' };
    });

    it.each(invalidClientIds)('should throw when the provided parameter "client_id" is invalid.', async (clientId) => {
      const request = requestFactory({ client_id: clientId });

      const error = new InvalidRequestError('Invalid parameter "client_id".');

      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidRequestError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[NoneClientAuthentication] Invalid parameter "client_id"',
        '28054030-e27b-48fd-9d86-cad2702306d8',
        { request },
        error,
      );
    });

    it('should throw when no Client is found.', async () => {
      const request = requestFactory();

      dataAccessMock.findClientById.mockResolvedValueOnce(null);

      const error = new InvalidClientError('Failed to authenticate the Client.');
      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[NoneClientAuthentication] Could not find a Client with the provided Identifier',
        '46aed74d-4cd1-413b-9e2d-f8df273612ce',
        { request },
        error,
      );
    });

    it('should throw when the Client has a Secret.', async () => {
      const request = requestFactory();

      const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(
        Reflect.construct(ClientSecret, []),
        { secret: 'client_secret', expiresAt: new Date(Date.now() + 3600000) },
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
        '[NoneClientAuthentication] The Client has a Secret',
        'fdceadbc-efe2-4753-ac82-dc8667b5435d',
        { request },
        error,
      );
    });

    it('should throw when the Client is not allowed to use this Client Authentication Method.', async () => {
      const request = requestFactory();

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'client_id',
        secrets: [],
        authenticationMethod: 'client_secret_basic',
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      const error = new InvalidClientError('Failed to authenticate the Client.');
      await expect(clientAuthentication.getClient(request)).rejects.toThrowWithMessage(
        InvalidClientError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[NoneClientAuthentication] The Client is not allowed to use the Authentication Method "none"',
        '9234e12f-1aa5-46d0-9bb7-4c3bcc0043cb',
        { request },
        error,
      );
    });

    it('should return the Client based on the provided Client Identifier.', async () => {
      const request = requestFactory();

      const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'client_id',
        secrets: [],
        authenticationMethod: 'none',
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      await expect(clientAuthentication.getClient(request)).resolves.toStrictEqual(client);
    });
  });
});
