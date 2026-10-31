import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { CodeTokenAuthorizationContext } from '../../context/authorization/code-token/code-token.authorization-request';
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
import { Logger } from '../../loggers/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { CodeTokenAuthorizationResponse } from '../../responses/authorization/code-token/code-token.authorization-response';
import { ResponseTypeName } from '../response-type-name.type';
import { CodeTokenResponseType } from './code-token.response-type';

jest.mock('../../loggers/logger');

describe('Code & Token Response Type', () => {
  let responseType: CodeTokenResponseType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      atomic: jest.fn(),
      createAccessToken: jest.fn(),
      createAuthorizationCode: jest.fn(),
    }),
  );

  const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { id: 'client_id' });
  const user: User = Object.assign<User, Partial<User>>(new User(), { id: 'user_id' });

  const activeLogin: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

  const scopes: Scope[] = ['foo', 'bar'].map((scope) => {
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

  const authorizationCode: AuthorizationCode = Object.assign<AuthorizationCode, Partial<AuthorizationCode>>(
    new AuthorizationCode(),
    { id: 'authorization_code' },
  );

  const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(new AccessToken(), {
    id: 'access_token',
    type: 'Bearer',
    scopes,
    expiresAt: new Date(Date.now() + 3600000),
  });

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
      expect(responseType.name).toBe<ResponseTypeName>('code token');
    });
  });

  describe('defaultResponseMode', () => {
    it('should have "fragment" as its value.', () => {
      expect(responseType.defaultResponseMode).toBe<ResponseModeName>('fragment');
    });
  });

  describe('handle()', () => {
    const context = { parameters: {}, session } as CodeTokenAuthorizationContext;

    it('should return a Code & Token Authorization Response.', async () => {
      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);
      dataAccessMock.createAuthorizationCode.mockResolvedValueOnce(authorizationCode);

      await expect(responseType.handle(context)).resolves.toStrictEqual<CodeTokenAuthorizationResponse>({
        code: 'authorization_code',
        access_token: 'access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'foo bar',
      });
    });
  });
});
