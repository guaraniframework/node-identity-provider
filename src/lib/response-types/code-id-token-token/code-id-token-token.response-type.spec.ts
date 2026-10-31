import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { CodeIdTokenTokenAuthorizationContext } from '../../context/authorization/code-id-token-token/code-id-token-token.authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { AuthorizationCode } from '../../entities/authorization-code';
import { Client } from '../../entities/client';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Scope } from '../../entities/scope';
import { Session } from '../../entities/session';
import { User } from '../../entities/user';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../loggers/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { CodeIdTokenTokenAuthorizationResponse } from '../../responses/authorization/code-id-token-token/code-id-token-token.authorization-response';
import { ResponseTypeName } from '../response-type-name.type';
import { CodeIdTokenTokenResponseType } from './code-id-token-token.response-type';

jest.mock('../../handlers/id-token/id-token.handler');
jest.mock('../../loggers/logger');

describe('Code & ID Token & Token Response Type', () => {
  let responseType: CodeIdTokenTokenResponseType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      atomic: jest.fn(),
      createAccessToken: jest.fn(),
      createAuthorizationCode: jest.fn(),
    }),
  );

  const idTokenHandlerMock = jest.mocked(IdTokenHandler.prototype);

  const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { id: 'client_id' });
  const user: User = Object.assign<User, Partial<User>>(new User(), { id: 'user_id' });

  const activeLogin: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

  const scopes: Scope[] = ['openid', 'foo', 'bar'].map((scope) => {
    return Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope });
  });

  const consent: Consent = Object.assign<Consent, Partial<Consent>>(new Consent(), {
    id: 'consent_id',
    scopes,
    client,
    user,
  });

  const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
    id: 'grant_id',
    consent,
  });

  const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
    id: 'session_id',
    activeLogin,
    grant,
  });

  const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(new AccessToken(), {
    id: 'access_token',
    type: 'Bearer',
    scopes,
    expiresAt: new Date(Date.now() + 3600000),
  });

  const authorizationCode: AuthorizationCode = Object.assign<AuthorizationCode, Partial<AuthorizationCode>>(
    new AuthorizationCode(),
    { id: 'authorization_code' },
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(IdTokenHandler).toValue(idTokenHandlerMock);
    container.bind(CodeIdTokenTokenResponseType).toSelf().asSingleton();

    responseType = container.resolve(CodeIdTokenTokenResponseType);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "code id_token token" as its value.', () => {
      expect(responseType.name).toBe<ResponseTypeName>('code id_token token');
    });
  });

  describe('defaultResponseMode', () => {
    it('should have "fragment" as its value.', () => {
      expect(responseType.defaultResponseMode).toBe<ResponseModeName>('fragment');
    });
  });

  describe('handle()', () => {
    it('should return a Code & ID Token & Token Authorization Response.', async () => {
      const context = { parameters: {}, nonce: 'nonce', maxAge: 300, session } as CodeIdTokenTokenAuthorizationContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);
      dataAccessMock.createAuthorizationCode.mockResolvedValueOnce(authorizationCode);
      idTokenHandlerMock.generateIdToken.mockResolvedValueOnce('id_token');

      await expect(responseType.handle(context)).resolves.toStrictEqual<CodeIdTokenTokenAuthorizationResponse>({
        code: 'authorization_code',
        id_token: 'id_token',
        access_token: 'access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid foo bar',
      });

      expect(idTokenHandlerMock.generateIdToken).toHaveBeenCalledExactlyOnceWith(activeLogin, consent, {
        maxAge: context.maxAge,
        nonce: context.nonce,
        accessToken,
        authorizationCode,
      });
    });

    it('should return a Code & ID Token & Token Authorization Response with default Generate ID Token Options.', async () => {
      const context = { parameters: {}, session } as CodeIdTokenTokenAuthorizationContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);
      dataAccessMock.createAuthorizationCode.mockResolvedValueOnce(authorizationCode);
      idTokenHandlerMock.generateIdToken.mockResolvedValueOnce('id_token');

      await expect(responseType.handle(context)).resolves.toStrictEqual<CodeIdTokenTokenAuthorizationResponse>({
        code: 'authorization_code',
        id_token: 'id_token',
        access_token: 'access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid foo bar',
      });

      expect(idTokenHandlerMock.generateIdToken).toHaveBeenCalledExactlyOnceWith(activeLogin, consent, {
        accessToken,
        authorizationCode,
      });
    });
  });
});
