import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { ClientCredentialsTokenContext } from '../../context/token/client-credentials/client-credentials.token-context';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { Client } from '../../entities/client';
import { Scope } from '../../entities/scope';
import { Logger } from '../../loggers/logger';
import { ClientCredentialsTokenRequest } from '../../requests/token/client-credentials/client-credentials.token-request';
import { ClientCredentialsTokenResponse } from '../../responses/token/client-credentials/client-credentials.token-response';
import { GrantTypeName } from '../grant-type-name.type';
import { ClientCredentialsGrantType } from './client-credentials.grant-type';

jest.mock('../../loggers/logger');

describe('Client Credentials Grant Type', () => {
  let grantType: ClientCredentialsGrantType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      createAccessToken: jest.fn(),
    }),
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ClientCredentialsGrantType).toSelf().asSingleton();

    grantType = container.resolve(ClientCredentialsGrantType);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "client_credentials" as its value.', () => {
      expect(grantType.name).toBe<GrantTypeName>('client_credentials');
    });
  });

  describe('handle()', () => {
    const parameters: ClientCredentialsTokenRequest = { grant_type: 'client_credentials' };

    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { id: 'client_id' });
    const scopes: Scope[] = ['foo', 'bar'].map((name) => Object.assign<Scope, Partial<Scope>>(new Scope(), { name }));

    it('should return a Client Credentials Token Response.', async () => {
      const context: ClientCredentialsTokenContext = { parameters, grantType, client, scopes };

      const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(new AccessToken(), {
        id: 'access_token_id',
        type: 'Bearer',
        scopes,
        expiresAt: new Date(Date.now() + 86400000),
      });

      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);

      await expect(grantType.handle(context)).resolves.toStrictEqual<ClientCredentialsTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'foo bar',
      });

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, null);
    });
  });
});
