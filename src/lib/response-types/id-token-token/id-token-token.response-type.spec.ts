import { getContainer } from '@guarani/di';

import { IdTokenTokenAuthorizationContext } from '../../context/authorization/id-token-token/id-token-token.authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Session } from '../../entities/session';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { IdTokenTokenAuthorizationResponse } from '../../responses/authorization/id-token-token/id-token-token.authorization-response';
import { ResponseTypeName } from '../response-type-name.type';
import { IdTokenTokenResponseType } from './id-token-token.response-type';

jest.mock('../../handlers/id-token/id-token.handler');
jest.mock('../../logger/logger');

describe('ID Token Token Response Type', () => {
  let responseType: IdTokenTokenResponseType;

  const now = Date.now();

  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const idTokenHandlerMock = jest.mocked(IdTokenHandler.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      createAccessToken: jest.fn(),
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

  const accessToken: AccessToken = Object.assign<AccessToken, Partial<AccessToken>>(
    Reflect.construct(AccessToken, []),
    { id: 'access_token', scopes: consent.scopes, expiresAt: new Date(now + 3600000) },
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(IdTokenHandler).toValue(idTokenHandlerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(IdTokenTokenResponseType).toSelf().asSingleton();

    responseType = container.resolve(IdTokenTokenResponseType);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "id_token token" as its value.', () => {
      expect(responseType.name).toEqual<ResponseTypeName>('id_token token');
    });
  });

  describe('defaultResponseMode', () => {
    it('should have "fragment" as its value.', () => {
      expect(responseType.defaultResponseMode).toEqual<ResponseModeName>('fragment');
    });
  });

  describe('handle()', () => {
    it('should throw when the Scope "openid" is not granted by the User.', async () => {
      const context = { session: badSession } as IdTokenTokenAuthorizationContext;
      const error = new InvalidRequestError('Missing required scope "openid".');

      await expect(responseType.handle(context)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[IdTokenTokenResponseType] Missing required scope "openid"',
        'f27a5dd8-dffe-40bd-9721-5af7a1300e29',
        { context },
        error,
      );
    });

    it('should return an ID Token Token Authorization Response.', async () => {
      const context = { nonce: 'nonce', maxAge: 300, session } as IdTokenTokenAuthorizationContext;

      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);
      idTokenHandlerMock.generateIdToken.mockResolvedValueOnce('id_token');

      await expect(responseType.handle(context)).resolves.toStrictEqual<IdTokenTokenAuthorizationResponse>({
        access_token: 'access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid foo bar',
        id_token: 'id_token',
      });

      expect(idTokenHandlerMock.generateIdToken).toHaveBeenCalledExactlyOnceWith(activeLogin, consent, {
        maxAge: context.maxAge,
        nonce: context.nonce,
        accessToken,
      });
    });

    it('should return an ID Token Token Authorization Response with default Generate ID Token Options.', async () => {
      const context = { session } as IdTokenTokenAuthorizationContext;

      dataAccessMock.createAccessToken.mockResolvedValueOnce(accessToken);
      idTokenHandlerMock.generateIdToken.mockResolvedValueOnce('id_token');

      await expect(responseType.handle(context)).resolves.toStrictEqual<IdTokenTokenAuthorizationResponse>({
        access_token: 'access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid foo bar',
        id_token: 'id_token',
      });

      expect(idTokenHandlerMock.generateIdToken).toHaveBeenCalledExactlyOnceWith(activeLogin, consent, {
        accessToken,
      });
    });
  });
});
