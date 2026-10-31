import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { JwtBearerTokenContext } from '../../context/token/jwt-bearer/jwt-bearer.token-context';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { Client } from '../../entities/client';
import { Scope } from '../../entities/scope';
import { User } from '../../entities/user';
import { Logger } from '../../loggers/logger';
import { JwtBearerTokenRequest } from '../../requests/token/jwt-bearer/jwt-bearer.token-request';
import { JwtBearerTokenResponse } from '../../responses/token/jwt-bearer/jwt-bearer.token-response';
import { GrantTypeName } from '../grant-type-name.type';
import { JwtBearerGrantType } from './jwt-bearer.grant-type';

jest.mock('../../loggers/logger');

describe('JWT Bearer Grant Type', () => {
  let grantType: JwtBearerGrantType;
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
    container.bind(JwtBearerGrantType).toSelf().asSingleton();

    grantType = container.resolve(JwtBearerGrantType);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "urn:ietf:params:oauth:grant-type:jwt-bearer" as its value.', () => {
      expect(grantType.name).toBe<GrantTypeName>('urn:ietf:params:oauth:grant-type:jwt-bearer');
    });
  });

  describe('handle()', () => {
    const parameters: JwtBearerTokenRequest = {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: 'assertion',
    };

    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { id: 'client_id' });
    const user: User = Object.assign<User, Partial<User>>(new User(), { id: 'user_id' });
    const scopes: Scope[] = ['foo', 'bar'].map((name) => Object.assign<Scope, Partial<Scope>>(new Scope(), { name }));

    it('should return a JWT Bearer Token Response.', async () => {
      const context: JwtBearerTokenContext = { parameters, grantType, client, user, scopes };

      const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(new AccessToken(), {
        id: 'access_token_id',
        type: 'Bearer',
        scopes,
        expiresAt: new Date(Date.now() + 86400000),
      });

      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);

      await expect(grantType.handle(context)).resolves.toStrictEqual<JwtBearerTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'foo bar',
      });

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
    });
  });
});
