import { getContainer } from '@guarani/di';

import { CodeIdTokenAuthorizationContext } from '../../context/authorization/code-id-token/code-id-token.authorization-context';
import { DataAccess } from '../../data-access/data-access';
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
import { CodeIdTokenAuthorizationResponse } from '../../responses/authorization/code-id-token.authorization-response';
import { ResponseTypeName } from '../response-type-name.type';
import { CodeIdTokenResponseType } from './code-id-token.response-type';

jest.mock('../../handlers/id-token/id-token.handler');
jest.mock('../../logger/logger');

describe('Code ID Token Response Type', () => {
  let responseType: CodeIdTokenResponseType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const idTokenHandlerMock = jest.mocked(IdTokenHandler.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      createAuthorizationCode: jest.fn(),
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

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(IdTokenHandler).toValue(idTokenHandlerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(CodeIdTokenResponseType).toSelf().asSingleton();

    responseType = container.resolve(CodeIdTokenResponseType);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "code id_token" as its value.', () => {
      expect(responseType.name).toEqual<ResponseTypeName>('code id_token');
    });
  });

  describe('defaultResponseMode', () => {
    it('should have "fragment" as its value.', () => {
      expect(responseType.defaultResponseMode).toEqual<ResponseModeName>('fragment');
    });
  });

  describe('handle()', () => {
    it('should throw when the Scope "openid" is not granted by the User.', async () => {
      const context = { session: badSession } as CodeIdTokenAuthorizationContext;
      const error = new InvalidRequestError('Missing required scope "openid".');

      await expect(responseType.handle(context)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CodeIdTokenResponseType] Missing required scope "openid"',
        '6fe15bed-518f-4b0a-a2cf-52771a8ed052',
        { context },
        error,
      );
    });

    it('should return a Code ID Token Authorization Response.', async () => {
      const context = { parameters: {}, session } as CodeIdTokenAuthorizationContext;

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
  });
});
