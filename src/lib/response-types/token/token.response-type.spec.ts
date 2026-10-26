import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { TokenAuthorizationContext } from '../../context/authorization/token/token.authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { Client } from '../../entities/client';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Scope } from '../../entities/scope';
import { Session } from '../../entities/session';
import { User } from '../../entities/user';
import { Logger } from '../../loggers/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { TokenAuthorizationResponse } from '../../responses/authorization/token/token.authorization-response';
import { ResponseTypeName } from '../response-type-name.type';
import { TokenResponseType } from './token.response-type';

jest.mock('../../loggers/logger');

describe('Token Response Type', () => {
  let responseType: TokenResponseType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      createAccessToken: jest.fn(),
    }),
  );

  const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });
  const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id' });

  const activeLogin: Login = Object.assign<Login, Partial<Login>>(Reflect.construct(Login, []), { id: 'login_id' });

  const scopes: Scope[] = ['foo', 'bar'].map((scope) => {
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

  const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(
    Reflect.construct(AccessToken, []),
    { id: 'access_token', scopes, expiresAt: new Date(Date.now() + 3600000) },
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(TokenResponseType).toSelf().asSingleton();

    responseType = container.resolve(TokenResponseType);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "token" as its value.', () => {
      expect(responseType.name).toBe<ResponseTypeName>('token');
    });
  });

  describe('defaultResponseMode', () => {
    it('should have "fragment" as its value.', () => {
      expect(responseType.defaultResponseMode).toBe<ResponseModeName>('fragment');
    });
  });

  describe('handle()', () => {
    const context = { session } as TokenAuthorizationContext;

    it('should return a Token Authorization Response.', async () => {
      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);

      await expect(responseType.handle(context)).resolves.toStrictEqual<TokenAuthorizationResponse>({
        access_token: 'access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'foo bar',
      });
    });
  });
});
