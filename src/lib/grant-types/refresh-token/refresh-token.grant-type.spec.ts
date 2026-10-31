import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { RefreshTokenTokenContext } from '../../context/token/refresh-token/refresh-token.token-context';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { Client } from '../../entities/client';
import { RefreshToken } from '../../entities/refresh-token';
import { Scope } from '../../entities/scope';
import { User } from '../../entities/user';
import { Logger } from '../../loggers/logger';
import { RefreshTokenTokenRequest } from '../../requests/token/refresh-token/refresh-token.token-request';
import { RefreshTokenTokenResponse } from '../../responses/token/refresh-token/refresh-token.token-response';
import { Settings } from '../../settings/settings';
import { GrantTypeName } from '../grant-type-name.type';
import { RefreshTokenGrantType } from './refresh-token.grant-type';

jest.mock('../../loggers/logger');

describe('Refresh Token Grant Type', () => {
  let grantType: RefreshTokenGrantType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      atomic: jest.fn(),
      createAccessToken: jest.fn(),
      rotateRefreshToken: jest.fn(),
    }),
  );

  const settingsMock = jest.mocked<Settings>(
    Object.assign<Settings, Partial<Settings>>(Object.create(Settings.prototype), { enableRefreshTokenRotation: true }),
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(Settings).toValue(settingsMock);
    container.bind(RefreshTokenGrantType).toSelf().asSingleton();

    grantType = container.resolve(RefreshTokenGrantType);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "refresh_token" as its value.', () => {
      expect(grantType.name).toBe<GrantTypeName>('refresh_token');
    });
  });

  describe('constructor', () => {
    it('should throw when not implementing the method DataAccess.rotateRefreshToken().', () => {
      container.clear();

      const dataAccessMock = jest.mocked<DataAccess>(
        Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {}),
      );

      container.bind(Logger).toValue(loggerMock);
      container.bind(DataAccess).toValue(dataAccessMock);
      container.bind(Settings).toValue(settingsMock);
      container.bind(RefreshTokenGrantType).toSelf().asSingleton();

      const error = new TypeError('Missing implementation of required method "DataAccess.rotateRefreshToken".');
      expect(() => container.resolve(RefreshTokenGrantType)).toThrowWithMessage(TypeError, error.message);

      expect(loggerMock.fatal).toHaveBeenCalledExactlyOnceWith(
        '[RefreshTokenGrantType] Missing implementation of required method "DataAccess.rotateRefreshToken"',
        'e801b755-f734-47c2-b0f5-6aeebe7993c2',
        null,
        error,
      );
    });
  });

  describe('handle()', () => {
    const now = Date.now();

    const parameters: RefreshTokenTokenRequest = { grant_type: 'refresh_token', refresh_token: 'refresh_token_id' };

    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { id: 'client_id' });
    const user: User = Object.assign<User, Partial<User>>(new User(), { id: 'user_id' });
    const scopes: Scope[] = ['foo', 'bar'].map((name) => Object.assign<Scope, Partial<Scope>>(new Scope(), { name }));

    const refreshToken: RefreshToken = Object.assign<RefreshToken, Partial<RefreshToken>>(new RefreshToken(), {
      id: 'refresh_token_id',
      user,
    });

    it('should return a Refresh Token Token Response without Refresh Token Rotation.', async () => {
      const context: RefreshTokenTokenContext = { parameters, grantType, client, refreshToken, scopes };

      const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(new AccessToken(), {
        id: 'access_token_id',
        type: 'Bearer',
        scopes,
        expiresAt: new Date(now + 86400000),
      });

      Reflect.set(settingsMock, 'enableRefreshTokenRotation', false);

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);

      await expect(grantType.handle(context)).resolves.toStrictEqual<RefreshTokenTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'foo bar',
        refresh_token: 'refresh_token_id',
      });

      Reflect.set(settingsMock, 'enableRefreshTokenRotation', true);

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(dataAccessMock.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('should return a Refresh Token Token Response with Refresh Token Rotation.', async () => {
      const context: RefreshTokenTokenContext = { parameters, grantType, client, refreshToken, scopes };

      const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(new AccessToken(), {
        id: 'access_token_id',
        type: 'Bearer',
        scopes,
        expiresAt: new Date(now + 86400000),
      });

      const newRefreshToken: RefreshToken = Object.assign<RefreshToken, Partial<RefreshToken>>(new RefreshToken(), {
        id: 'new_refresh_token_id',
      });

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);
      dataAccessMock.rotateRefreshToken!.mockResolvedValueOnce(newRefreshToken);

      await expect(grantType.handle(context)).resolves.toStrictEqual<RefreshTokenTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'foo bar',
        refresh_token: 'new_refresh_token_id',
      });

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(dataAccessMock.rotateRefreshToken).toHaveBeenCalledExactlyOnceWith(refreshToken);
    });
  });
});
