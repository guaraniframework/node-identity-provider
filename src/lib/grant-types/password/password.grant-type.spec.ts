import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { PasswordTokenContext } from '../../context/token/password/password.token-context';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { Client } from '../../entities/client';
import { RefreshToken } from '../../entities/refresh-token';
import { Scope } from '../../entities/scope';
import { User } from '../../entities/user';
import { Logger } from '../../loggers/logger';
import { PasswordTokenRequest } from '../../requests/token/password/password.token-request';
import { PasswordTokenResponse } from '../../responses/token/password/password.token-response';
import { GrantTypeName } from '../grant-type-name.type';
import { PasswordGrantType } from './password.grant-type';

jest.mock('../../loggers/logger');

describe('Resource Owner Password Credentials Grant Type', () => {
  let grantType: PasswordGrantType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      atomic: jest.fn(),
      createAccessToken: jest.fn(),
      createRefreshToken: jest.fn(),
    }),
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(PasswordGrantType).toSelf().asSingleton();

    grantType = container.resolve(PasswordGrantType);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "password" as its value.', () => {
      expect(grantType.name).toBe<GrantTypeName>('password');
    });
  });

  describe('handle()', () => {
    const now = Date.now();

    const parameters: PasswordTokenRequest = { grant_type: 'password', username: 'username', password: 'password' };

    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
      id: 'client_id',
      grantTypes: ['password', 'refresh_token'],
    });

    const user: User = Object.assign<User, Partial<User>>(new User(), { id: 'user_id' });
    const scopes: Scope[] = ['foo', 'bar'].map((name) => Object.assign<Scope, Partial<Scope>>(new Scope(), { name }));

    const refreshToken: RefreshToken = Object.assign<RefreshToken, Partial<RefreshToken>>(new RefreshToken(), {
      id: 'refresh_token_id',
      user,
    });

    it('should return a Resource Owner Password Credentials Token Response without a Refresh Token when the Identity Provider does not support it.', async () => {
      const context: PasswordTokenContext = { parameters, grantType, client, user, scopes };

      const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(new AccessToken(), {
        id: 'access_token_id',
        type: 'Bearer',
        scopes,
        expiresAt: new Date(now + 86400000),
      });

      Reflect.deleteProperty(dataAccessMock, 'createRefreshToken');

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);

      await expect(grantType.handle(context)).resolves.toStrictEqual<PasswordTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'foo bar',
      });

      Reflect.set(dataAccessMock, 'createRefreshToken', jest.fn());

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(dataAccessMock.createRefreshToken).not.toHaveBeenCalled();
    });

    it('should return a Resource Owner Password Credentials Token Response without a Refresh Token when the Client does not support it.', async () => {
      const context: PasswordTokenContext = { parameters, grantType, client, user, scopes };

      const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(new AccessToken(), {
        id: 'access_token_id',
        type: 'Bearer',
        scopes,
        expiresAt: new Date(now + 86400000),
      });

      Reflect.set(client, 'grantTypes', ['password']);

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);

      await expect(grantType.handle(context)).resolves.toStrictEqual<PasswordTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'foo bar',
      });

      Reflect.set(client, 'grantTypes', ['password', 'refresh_token']);

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(dataAccessMock.createRefreshToken).not.toHaveBeenCalled();
    });

    it('should return a Resource Owner Password Credentials Token Response with a Refresh Token.', async () => {
      const context: PasswordTokenContext = { parameters, grantType, client, user, scopes };

      const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(new AccessToken(), {
        id: 'access_token_id',
        type: 'Bearer',
        scopes,
        expiresAt: new Date(now + 86400000),
      });

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);
      dataAccessMock.createRefreshToken!.mockResolvedValueOnce(refreshToken);

      await expect(grantType.handle(context)).resolves.toStrictEqual<PasswordTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'foo bar',
        refresh_token: 'refresh_token_id',
      });

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(dataAccessMock.createRefreshToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
    });
  });
});
