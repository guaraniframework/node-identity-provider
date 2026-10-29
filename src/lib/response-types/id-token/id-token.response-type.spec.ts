import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { IdTokenAuthorizationContext } from '../../context/authorization/id-token/id-token.authorization-context';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Scope } from '../../entities/scope';
import { Session } from '../../entities/session';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { Logger } from '../../loggers/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { IdTokenAuthorizationResponse } from '../../responses/authorization/id-token/id-token.authorization-response';
import { ResponseTypeName } from '../response-type-name.type';
import { IdTokenResponseType } from './id-token.response-type';

jest.mock('../../handlers/id-token/id-token.handler');
jest.mock('../../loggers/logger');

describe('ID Token Response Type', () => {
  let responseType: IdTokenResponseType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const idTokenHandlerMock = jest.mocked(IdTokenHandler.prototype);

  const activeLogin: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

  const scopes: Scope[] = ['openid', 'foo', 'bar'].map((scope) => {
    return Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope });
  });

  const consent: Consent = Object.assign<Consent, Partial<Consent>>(new Consent(), {
    id: 'consent_id',
    scopes,
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
      expect(responseType.name).toBe<ResponseTypeName>('id_token');
    });
  });

  describe('defaultResponseMode', () => {
    it('should have "fragment" as its value.', () => {
      expect(responseType.defaultResponseMode).toBe<ResponseModeName>('fragment');
    });
  });

  describe('handle()', () => {
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
