import { getContainer } from '@guarani/di';

import { CodeIdTokenTokenAuthorizationContext } from '../../context/authorization/code-id-token-token/code-id-token-token.authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { AuthorizationCode } from '../../entities/authorization-code';
import { Client } from '../../entities/client';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Session } from '../../entities/session';
import { User } from '../../entities/user';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { CodeIdTokenTokenAuthorizationResponse } from '../../responses/authorization/code-id-token-token/code-id-token-token.authorization-response';
import { ResponseTypeName } from '../response-type-name.type';
import { CodeIdTokenTokenResponseType } from './code-id-token-token.response-type';

jest.mock('../../handlers/id-token/id-token.handler');
jest.mock('../../logger/logger');

describe('Code ID Token Token Response Type', () => {
  let responseType: CodeIdTokenTokenResponseType;

  const now = Date.now();

  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const idTokenHandlerMock = jest.mocked(IdTokenHandler.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      createAccessTokenAndAuthorizationCode: jest.fn(),
    }),
  );

  const activeLogin: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login_id' });

  const badConsent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
    id: 'consent_id',
    scopes: ['foo', 'bar'],
  });

  const badGrant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
    id: 'grant_id',
    consent: badConsent,
  });

  const badSession: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
    id: 'session_id',
    activeLogin,
    grant: badGrant,
  });

  const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });
  const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

  const consent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
    id: 'consent_id',
    scopes: ['openid', 'foo', 'bar'],
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

  const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(
    Reflect.construct(AccessToken, []),
    {
      id: 'access_token',
      scopes: consent.scopes,
      expiresAt: new Date(now + 3600000),
    },
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(IdTokenHandler).toValue(idTokenHandlerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(CodeIdTokenTokenResponseType).toSelf().asSingleton();

    responseType = container.resolve(CodeIdTokenTokenResponseType);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "code id_token token" as its value.', () => {
      expect(responseType.name).toEqual<ResponseTypeName>('code id_token token');
    });
  });

  describe('defaultResponseMode', () => {
    it('should have "fragment" as its value.', () => {
      expect(responseType.defaultResponseMode).toEqual<ResponseModeName>('fragment');
    });
  });

  describe('handle()', () => {
    it('should throw when the Scope "openid" is not granted by the User.', async () => {
      const context = { session: badSession } as CodeIdTokenTokenAuthorizationContext;
      const error = new InvalidRequestError('Missing required scope "openid".');

      await expect(responseType.handle(context)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CodeIdTokenTokenResponseType] Missing required scope "openid"',
        'dc5c6e1f-8ae2-4369-a5e3-dadcebdb4694',
        { context },
        error,
      );
    });

    it('should return a Code ID Token Token Authorization Response.', async () => {
      const context = { parameters: {}, session } as CodeIdTokenTokenAuthorizationContext;

      dataAccessMock.createAccessTokenAndAuthorizationCode.mockResolvedValueOnce([accessToken, authorizationCode]);
      idTokenHandlerMock.generateIdToken.mockResolvedValueOnce('id_token');

      await expect(responseType.handle(context)).resolves.toStrictEqual<CodeIdTokenTokenAuthorizationResponse>({
        access_token: 'access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid foo bar',
        code: 'authorization_code',
        id_token: 'id_token',
      });

      expect(idTokenHandlerMock.generateIdToken).toHaveBeenCalledExactlyOnceWith(activeLogin, consent, {
        maxAge: context.maxAge,
        nonce: context.nonce,
        accessToken,
        authorizationCode,
      });
    });
  });
});
