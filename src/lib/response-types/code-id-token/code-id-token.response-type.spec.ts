import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { CodeIdTokenAuthorizationContext } from '../../context/authorization/code-id-token/code-id-token.authorization-context';
import { DataAccess } from '../../data-access/data-access';
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
import { PKCE } from '../../pkces/pkce';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { CodeIdTokenAuthorizationResponse } from '../../responses/authorization/code-id-token/code-id-token.authorization-response';
import { ResponseTypeName } from '../response-type-name.type';
import { CodeIdTokenResponseType } from './code-id-token.response-type';

jest.mock('../../handlers/id-token/id-token.handler');
jest.mock('../../loggers/logger');
jest.mock('../../pkces/pkce');

describe('Code & ID Token Response Type', () => {
  let responseType: CodeIdTokenResponseType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      atomic: jest.fn(),
      createAuthorizationCode: jest.fn(),
    }),
  );

  const idTokenHandlerMock = jest.mocked(IdTokenHandler.prototype);

  const pkceMock = jest.mocked(PKCE.prototype);

  const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });
  const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

  const activeLogin: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login_id' });

  const scopes: Scope[] = ['openid', 'foo', 'bar'].map((scope) => {
    return Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope });
  });

  const consent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
    id: 'consent_id',
    scopes,
    client,
    user,
  });

  const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
    id: 'grant_id',
    consent,
  });

  const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
    id: 'session_id',
    activeLogin,
    grant,
  });

  const authorizationCode: AuthorizationCode = Object.assign<AuthorizationCode, Partial<AuthorizationCode>>(
    Reflect.construct(AuthorizationCode, []),
    { id: 'authorization_code' },
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(IdTokenHandler).toValue(idTokenHandlerMock);
    container.bind(CodeIdTokenResponseType).toSelf().asSingleton();

    responseType = container.resolve(CodeIdTokenResponseType);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "code id_token" as its value.', () => {
      expect(responseType.name).toBe<ResponseTypeName>('code id_token');
    });
  });

  describe('defaultResponseMode', () => {
    it('should have "fragment" as its value.', () => {
      expect(responseType.defaultResponseMode).toBe<ResponseModeName>('fragment');
    });
  });

  describe('handle()', () => {
    it('should return a Code & ID Token Authorization Response.', async () => {
      const context = {
        codeChallenge: 'code_challenge',
        codeChallengeMethod: pkceMock as PKCE,
        nonce: 'nonce',
        maxAge: 300,
        session,
      } as CodeIdTokenAuthorizationContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAuthorizationCode.mockResolvedValueOnce(authorizationCode);
      idTokenHandlerMock.generateIdToken.mockResolvedValueOnce('id_token');

      await expect(responseType.handle(context)).resolves.toStrictEqual<CodeIdTokenAuthorizationResponse>({
        code: 'authorization_code',
        id_token: 'id_token',
      });

      expect(idTokenHandlerMock.generateIdToken).toHaveBeenCalledExactlyOnceWith(activeLogin, consent, {
        maxAge: context.maxAge,
        nonce: context.nonce,
        authorizationCode,
      });
    });

    it('should return a Code & ID Token Authorization Response with default Generate ID Token Options.', async () => {
      const context = {
        codeChallenge: 'code_challenge',
        codeChallengeMethod: pkceMock as PKCE,
        session,
      } as CodeIdTokenAuthorizationContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAuthorizationCode.mockResolvedValueOnce(authorizationCode);
      idTokenHandlerMock.generateIdToken.mockResolvedValueOnce('id_token');

      await expect(responseType.handle(context)).resolves.toStrictEqual<CodeIdTokenAuthorizationResponse>({
        code: 'authorization_code',
        id_token: 'id_token',
      });

      expect(idTokenHandlerMock.generateIdToken).toHaveBeenCalledExactlyOnceWith(activeLogin, consent, {
        authorizationCode,
      });
    });
  });
});
