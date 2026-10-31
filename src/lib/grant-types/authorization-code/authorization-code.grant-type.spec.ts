import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { AuthorizationCodeTokenContext } from '../../context/token/authorization-code/authorization-code.token-context';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { AuthorizationCode } from '../../entities/authorization-code';
import { Client } from '../../entities/client';
import { Consent } from '../../entities/consent';
import { Login } from '../../entities/login';
import { RefreshToken } from '../../entities/refresh-token';
import { Scope } from '../../entities/scope';
import { User } from '../../entities/user';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../loggers/logger';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { AuthorizationCodeTokenRequest } from '../../requests/token/authorization-code/authorization-code.token-request';
import { AuthorizationCodeTokenResponse } from '../../responses/token/authorization-code/authorization-code.token-response';
import { GrantTypeName } from '../grant-type-name.type';
import { AuthorizationCodeGrantType } from './authorization-code.grant-type';

jest.mock('../../loggers/logger');
jest.mock('../../handlers/id-token/id-token.handler');

describe('Authorization Code Grant Type', () => {
  let grantType: AuthorizationCodeGrantType;
  const container = getContainer(CONTAINER);

  let loggerMock: jest.MockedObjectDeep<Logger>;
  let dataAccessMock: jest.MockedObjectDeep<DataAccess>;
  let idTokenHandlerMock: jest.MockedObjectDeep<IdTokenHandler>;

  beforeEach(() => {
    loggerMock = jest.mocked(Logger.prototype);

    dataAccessMock = jest.mocked<DataAccess>(
      Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
        atomic: jest.fn(),
        createAccessToken: jest.fn(),
        createRefreshToken: jest.fn(),
        revokeAuthorizationCode: jest.fn(),
      }),
    );

    idTokenHandlerMock = jest.mocked(IdTokenHandler.prototype);

    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(IdTokenHandler).toValue(idTokenHandlerMock);
    container.bind(AuthorizationCodeGrantType).toSelf().asSingleton();

    grantType = container.resolve(AuthorizationCodeGrantType);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "authorization_code" as its value.', () => {
      expect(grantType.name).toBe<GrantTypeName>('authorization_code');
    });
  });

  describe('handle()', () => {
    const now = Date.now();

    let parameters: AuthorizationCodeTokenRequest;
    let authorizationRequestParameters: AuthorizationRequest;
    let client: Client;
    let user: User;
    let scopes: Scope[];
    let login: Login;
    let consent: Consent;
    let authorizationCode: AuthorizationCode;
    let accessToken: AccessToken;
    let refreshToken: RefreshToken;

    beforeEach(() => {
      parameters = {
        grant_type: 'authorization_code',
        code: 'authorization_code_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
        code_verifier: 'code_challenge',
      };

      authorizationRequestParameters = { max_age: '300', nonce: 'nonce' } as AuthorizationRequest;

      client = Object.assign<Client, Partial<Client>>(new Client(), {
        id: 'client_id',
        grantTypes: ['authorization_code', 'refresh_token'],
      });

      user = Object.assign<User, Partial<User>>(new User(), { id: 'user_id' });
      scopes = ['openid', 'foo', 'bar'].map((name) => Object.assign<Scope, Partial<Scope>>(new Scope(), { name }));
      login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

      consent = Object.assign<Consent, Partial<Consent>>(new Consent(), {
        id: 'consent_id',
        scopes,
        user,
      });

      authorizationCode = Object.assign<AuthorizationCode, Partial<AuthorizationCode>>(new AuthorizationCode(), {
        id: 'authorization_code_id',
        parameters: authorizationRequestParameters,
        login,
        consent,
      });

      accessToken = Object.assign<AccessToken, Partial<AccessToken>>(new AccessToken(), {
        id: 'access_token_id',
        type: 'Bearer',
        scopes,
        expiresAt: new Date(now + 86400000),
        user,
      });

      refreshToken = Object.assign<RefreshToken, Partial<RefreshToken>>(new RefreshToken(), {
        id: 'refresh_token_id',
      });
    });

    it('should return an Authorization Code Token Response with only an Access Token when the Identity Provider does not support Refresh Tokens and ID Tokens.', async () => {
      const context: AuthorizationCodeTokenContext = {
        parameters,
        grantType,
        client,
        authorizationCode,
        redirectUri: new URL(parameters.redirect_uri),
        codeVerifier: parameters.code_verifier,
      };

      Reflect.deleteProperty(dataAccessMock, 'createRefreshToken');
      Reflect.deleteProperty(grantType, 'idTokenHandler');

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);

      await expect(grantType.handle(context)).resolves.toStrictEqual<AuthorizationCodeTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'openid foo bar',
      });

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(dataAccessMock.revokeAuthorizationCode).toHaveBeenCalledExactlyOnceWith(authorizationCode);

      expect(dataAccessMock.createRefreshToken).toBeUndefined();
      expect(idTokenHandlerMock.generateIdToken).not.toHaveBeenCalled();
    });

    it('should return an Authorization Code Token Response with only an Access Token when the Client does not support Refresh Tokens and the Identity Provider does not support ID Tokens.', async () => {
      const context: AuthorizationCodeTokenContext = {
        parameters,
        grantType,
        client,
        authorizationCode,
        redirectUri: new URL(parameters.redirect_uri),
        codeVerifier: parameters.code_verifier,
      };

      Reflect.deleteProperty(grantType, 'idTokenHandler');
      client.grantTypes.pop();

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);

      await expect(grantType.handle(context)).resolves.toStrictEqual<AuthorizationCodeTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'openid foo bar',
      });

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(dataAccessMock.revokeAuthorizationCode).toHaveBeenCalledExactlyOnceWith(authorizationCode);

      expect(dataAccessMock.createRefreshToken).not.toHaveBeenCalled();
      expect(idTokenHandlerMock.generateIdToken).not.toHaveBeenCalled();
    });

    it('should return an Authorization Code Token Response with only an Access Token when the Identity Provider does not support Refresh Tokens and the Scope "openid" was not requested.', async () => {
      const context: AuthorizationCodeTokenContext = {
        parameters,
        grantType,
        client,
        authorizationCode,
        redirectUri: new URL(parameters.redirect_uri),
        codeVerifier: parameters.code_verifier,
      };

      Reflect.deleteProperty(dataAccessMock, 'createRefreshToken');
      scopes.shift();

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);

      await expect(grantType.handle(context)).resolves.toStrictEqual<AuthorizationCodeTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'foo bar',
      });

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(dataAccessMock.revokeAuthorizationCode).toHaveBeenCalledExactlyOnceWith(authorizationCode);

      expect(dataAccessMock.createRefreshToken).toBeUndefined();
      expect(idTokenHandlerMock.generateIdToken).not.toHaveBeenCalled();
    });

    it('should return an Authorization Code Token Response with only an Access Token when the Client does not support Refresh Tokens and the Scope "openid" was not requested.', async () => {
      const context: AuthorizationCodeTokenContext = {
        parameters,
        grantType,
        client,
        authorizationCode,
        redirectUri: new URL(parameters.redirect_uri),
        codeVerifier: parameters.code_verifier,
      };

      scopes.shift();
      client.grantTypes.pop();

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);

      await expect(grantType.handle(context)).resolves.toStrictEqual<AuthorizationCodeTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'foo bar',
      });

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(dataAccessMock.revokeAuthorizationCode).toHaveBeenCalledExactlyOnceWith(authorizationCode);

      expect(dataAccessMock.createRefreshToken).not.toHaveBeenCalled();
      expect(idTokenHandlerMock.generateIdToken).not.toHaveBeenCalled();
    });

    it('should return an Authorization Code Token Response without an ID Token when the Identity Provider does not support ID Tokens.', async () => {
      const context: AuthorizationCodeTokenContext = {
        parameters,
        grantType,
        client,
        authorizationCode,
        redirectUri: new URL(parameters.redirect_uri),
        codeVerifier: parameters.code_verifier,
      };

      Reflect.deleteProperty(grantType, 'idTokenHandler');

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);
      dataAccessMock.createRefreshToken!.mockResolvedValueOnce(refreshToken);

      await expect(grantType.handle(context)).resolves.toStrictEqual<AuthorizationCodeTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'openid foo bar',
        refresh_token: 'refresh_token_id',
      });

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(dataAccessMock.createRefreshToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(dataAccessMock.revokeAuthorizationCode).toHaveBeenCalledExactlyOnceWith(authorizationCode);

      expect(idTokenHandlerMock.generateIdToken).not.toHaveBeenCalled();
    });

    it('should return an Authorization Code Token Response without an ID Token when the Scope "openid" was not requested.', async () => {
      const context: AuthorizationCodeTokenContext = {
        parameters,
        grantType,
        client,
        authorizationCode,
        redirectUri: new URL(parameters.redirect_uri),
        codeVerifier: parameters.code_verifier,
      };

      scopes.shift();

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);
      dataAccessMock.createRefreshToken!.mockResolvedValueOnce(refreshToken);

      await expect(grantType.handle(context)).resolves.toStrictEqual<AuthorizationCodeTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'foo bar',
        refresh_token: 'refresh_token_id',
      });

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(dataAccessMock.createRefreshToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(dataAccessMock.revokeAuthorizationCode).toHaveBeenCalledExactlyOnceWith(authorizationCode);

      expect(idTokenHandlerMock.generateIdToken).not.toHaveBeenCalled();
    });

    it('should return an Authorization Code Token Response without a Refresh Token when the Identity Provider does not support Refresh Tokens.', async () => {
      const context: AuthorizationCodeTokenContext = {
        parameters,
        grantType,
        client,
        authorizationCode,
        redirectUri: new URL(parameters.redirect_uri),
        codeVerifier: parameters.code_verifier,
      };

      Reflect.deleteProperty(dataAccessMock, 'createRefreshToken');

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);
      idTokenHandlerMock.generateIdToken.mockResolvedValueOnce('id_token');

      await expect(grantType.handle(context)).resolves.toStrictEqual<AuthorizationCodeTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'openid foo bar',
        id_token: 'id_token',
      });

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(idTokenHandlerMock.generateIdToken).toHaveBeenCalledExactlyOnceWith(login, consent, {
        accessToken,
        authorizationCode,
        maxAge: 300,
        nonce: 'nonce',
      });

      expect(dataAccessMock.revokeAuthorizationCode).toHaveBeenCalledExactlyOnceWith(authorizationCode);

      expect(dataAccessMock.createRefreshToken).toBeUndefined();
    });

    it('should return an Authorization Code Token Response without a Refresh Token when the Client does not support Refresh Tokens.', async () => {
      const context: AuthorizationCodeTokenContext = {
        parameters,
        grantType,
        client,
        authorizationCode,
        redirectUri: new URL(parameters.redirect_uri),
        codeVerifier: parameters.code_verifier,
      };

      Reflect.deleteProperty(authorizationCode.parameters, 'max_age');
      client.grantTypes.pop();

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);
      idTokenHandlerMock.generateIdToken.mockResolvedValueOnce('id_token');

      await expect(grantType.handle(context)).resolves.toStrictEqual<AuthorizationCodeTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'openid foo bar',
        id_token: 'id_token',
      });

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(idTokenHandlerMock.generateIdToken).toHaveBeenCalledExactlyOnceWith(login, consent, {
        accessToken,
        authorizationCode,
        maxAge: expect.toBeNil(),
        nonce: 'nonce',
      });

      expect(dataAccessMock.revokeAuthorizationCode).toHaveBeenCalledExactlyOnceWith(authorizationCode);

      expect(dataAccessMock.createRefreshToken).not.toHaveBeenCalled();
    });

    it('should return a complete Authorization Code Token Response.', async () => {
      const context: AuthorizationCodeTokenContext = {
        parameters,
        grantType,
        client,
        authorizationCode,
        redirectUri: new URL(parameters.redirect_uri),
        codeVerifier: parameters.code_verifier,
      };

      Reflect.deleteProperty(authorizationCode.parameters, 'nonce');

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);
      dataAccessMock.createRefreshToken!.mockResolvedValueOnce(refreshToken);
      idTokenHandlerMock.generateIdToken.mockResolvedValueOnce('id_token');

      await expect(grantType.handle(context)).resolves.toStrictEqual<AuthorizationCodeTokenResponse>({
        access_token: 'access_token_id',
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'openid foo bar',
        refresh_token: 'refresh_token_id',
        id_token: 'id_token',
      });

      expect(dataAccessMock.createAccessToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(dataAccessMock.createRefreshToken).toHaveBeenCalledExactlyOnceWith(scopes, client, user);
      expect(idTokenHandlerMock.generateIdToken).toHaveBeenCalledExactlyOnceWith(login, consent, {
        accessToken,
        authorizationCode,
        maxAge: 300,
        nonce: expect.toBeNil(),
      });

      expect(dataAccessMock.revokeAuthorizationCode).toHaveBeenCalledExactlyOnceWith(authorizationCode);
    });
  });
});
