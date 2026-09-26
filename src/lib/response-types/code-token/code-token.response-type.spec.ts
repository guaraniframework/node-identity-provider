import { getContainer } from '@guarani/di';

import { CodeTokenAuthorizationContext } from '../../context/authorization/code-token/code-token.authorization-request';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { AuthorizationCode } from '../../entities/authorization-code';
import { Client } from '../../entities/client';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Session } from '../../entities/session';
import { User } from '../../entities/user';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { CodeTokenAuthorizationResponse } from '../../responses/authorization/code-token/code-token.authorization-response';
import { ResponseTypeName } from '../response-type-name.type';
import { CodeTokenResponseType } from './code-token.response-type';

jest.mock('../../logger/logger');

describe('Code Token Response Type', () => {
  let responseType: CodeTokenResponseType;

  const now = Date.now();

  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      createAccessTokenAndAuthorizationCode: jest.fn(),
    }),
  );

  const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });
  const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

  const activeLogin: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login_id' });

  const consent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
    id: 'consent_id',
    scopes: ['foo', 'bar'],
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
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(CodeTokenResponseType).toSelf().asSingleton();

    responseType = container.resolve(CodeTokenResponseType);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "code token" as its value.', () => {
      expect(responseType.name).toEqual<ResponseTypeName>('code token');
    });
  });

  describe('defaultResponseMode', () => {
    it('should have "fragment" as its value.', () => {
      expect(responseType.defaultResponseMode).toEqual<ResponseModeName>('fragment');
    });
  });

  describe('handle()', () => {
    it('should return a Code Token Authorization Response.', async () => {
      const context = { parameters: {}, session } as CodeTokenAuthorizationContext;

      dataAccessMock.createAccessTokenAndAuthorizationCode.mockResolvedValueOnce([accessToken, authorizationCode]);

      await expect(responseType.handle(context)).resolves.toStrictEqual<CodeTokenAuthorizationResponse>({
        access_token: 'access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'foo bar',
        code: 'authorization_code',
      });
    });
  });
});
