import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { CodeAuthorizationContext } from '../../context/authorization/code/code.authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { AuthorizationCode } from '../../entities/authorization-code';
import { Client } from '../../entities/client';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Scope } from '../../entities/scope';
import { Session } from '../../entities/session';
import { User } from '../../entities/user';
import { Logger } from '../../loggers/logger';
import { PKCE } from '../../pkces/pkce';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { CodeAuthorizationResponse } from '../../responses/authorization/code/code.authorization-response';
import { ResponseTypeName } from '../response-type-name.type';
import { CodeResponseType } from './code.response-type';

jest.mock('../../loggers/logger');
jest.mock('../../pkces/pkce');

describe('Code Response Type', () => {
  let responseType: CodeResponseType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      createAuthorizationCode: jest.fn(),
    }),
  );

  const pkceMock = jest.mocked(PKCE.prototype);

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

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(CodeResponseType).toSelf().asSingleton();

    responseType = container.resolve(CodeResponseType);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "code" as its value.', () => {
      expect(responseType.name).toBe<ResponseTypeName>('code');
    });
  });

  describe('defaultResponseMode', () => {
    it('should have "query" as its value.', () => {
      expect(responseType.defaultResponseMode).toBe<ResponseModeName>('query');
    });
  });

  describe('handle()', () => {
    const context = {
      codeChallenge: 'code_challenge',
      codeChallengeMethod: pkceMock as PKCE,
      session,
    } as CodeAuthorizationContext;

    it('should return a Code Authorization Response.', async () => {
      dataAccessMock.createAuthorizationCode.mockResolvedValueOnce(authorizationCode);

      await expect(responseType.handle(context)).resolves.toStrictEqual<CodeAuthorizationResponse>({
        code: 'authorization_code',
      });
    });
  });
});
