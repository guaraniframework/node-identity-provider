import { getContainer } from '@guarani/di';

import { CodeAuthorizationContext } from '../../context/authorization/code/code.authorization-context';
import { DataAccess } from '../../data-access/data-access';
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
import { CodeAuthorizationResponse } from '../../responses/authorization/code/code.authorization-response';
import { ResponseTypeName } from '../response-type-name.type';
import { CodeResponseType } from './code.response-type';

jest.mock('../../logger/logger');

describe('Code Response Type', () => {
  let responseType: CodeResponseType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      createAuthorizationCode: jest.fn(),
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
      expect(responseType.name).toEqual<ResponseTypeName>('code');
    });
  });

  describe('defaultResponseMode', () => {
    it('should have "query" as its value.', () => {
      expect(responseType.defaultResponseMode).toEqual<ResponseModeName>('query');
    });
  });

  describe('handle()', () => {
    it('should return a Code Authorization Response.', async () => {
      const context = { parameters: {}, session } as CodeAuthorizationContext;

      const authorizationCode: AuthorizationCode = Object.assign<AuthorizationCode, Partial<AuthorizationCode>>(
        Reflect.construct(AuthorizationCode, []),
        { id: 'authorization_code' },
      );

      dataAccessMock.createAuthorizationCode.mockResolvedValueOnce(authorizationCode);

      await expect(responseType.handle(context)).resolves.toStrictEqual<CodeAuthorizationResponse>({
        code: 'authorization_code',
      });
    });
  });
});
