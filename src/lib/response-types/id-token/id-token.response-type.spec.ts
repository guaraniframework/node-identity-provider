import { getContainer } from '@guarani/di';

import { IdTokenAuthorizationContext } from '../../context/authorization/id-token/id-token.authorization-context';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Session } from '../../entities/session';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { IdTokenAuthorizationResponse } from '../../responses/authorization/id-token/id-token.authorization-response';
import { ResponseTypeName } from '../response-type-name.type';
import { IdTokenResponseType } from './id-token.response-type';

jest.mock('../../handlers/id-token/id-token.handler');
jest.mock('../../logger/logger');

describe('ID Token Response Type', () => {
  let responseType: IdTokenResponseType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const idTokenHandlerMock = jest.mocked(IdTokenHandler.prototype);

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

  const consent: Consent = Object.assign<Consent, Partial<Consent>>(Reflect.construct(Consent, []), {
    id: 'consent_id',
    scopes: ['openid', 'foo', 'bar'],
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
    container.bind(IdTokenHandler).toValue(idTokenHandlerMock);
    container.bind(IdTokenResponseType).toSelf().asSingleton();

    responseType = container.resolve(IdTokenResponseType);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "id_token" as its value.', () => {
      expect(responseType.name).toEqual<ResponseTypeName>('id_token');
    });
  });

  describe('defaultResponseMode', () => {
    it('should have "fragment" as its value.', () => {
      expect(responseType.defaultResponseMode).toEqual<ResponseModeName>('fragment');
    });
  });

  describe('handle()', () => {
    it('should throw when the Scope "openid" is not granted by the User.', async () => {
      const context = { session: badSession } as IdTokenAuthorizationContext;
      const error = new InvalidRequestError('Missing required scope "openid".');

      await expect(responseType.handle(context)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[IdTokenResponseType] Missing required scope "openid"',
        'a39eab70-3a5b-46f4-85ba-e0d15923b18c',
        { context },
        error,
      );
    });

    it('should return an ID Token Authorization Response.', async () => {
      const context = { nonce: 'nonce', maxAge: 300, session } as IdTokenAuthorizationContext;

      idTokenHandlerMock.generateIdToken.mockResolvedValueOnce('id_token');

      await expect(responseType.handle(context)).resolves.toStrictEqual<IdTokenAuthorizationResponse>({
        id_token: 'id_token',
      });

      expect(idTokenHandlerMock.generateIdToken).toHaveBeenCalledExactlyOnceWith(activeLogin, consent, {
        maxAge: context.maxAge,
        nonce: context.nonce,
      });
    });

    it('should return an ID Token Authorization Response with default Generate ID Token Options.', async () => {
      const context = { session } as IdTokenAuthorizationContext;

      idTokenHandlerMock.generateIdToken.mockResolvedValueOnce('id_token');

      await expect(responseType.handle(context)).resolves.toStrictEqual<IdTokenAuthorizationResponse>({
        id_token: 'id_token',
      });

      expect(idTokenHandlerMock.generateIdToken).toHaveBeenCalledExactlyOnceWith(activeLogin, consent, {});
    });
  });
});
