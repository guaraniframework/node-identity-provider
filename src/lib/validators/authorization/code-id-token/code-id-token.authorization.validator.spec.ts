import { Buffer } from 'buffer';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CONTAINER } from '../../../constants';
import { CodeIdTokenAuthorizationContext } from '../../../context/authorization/code-id-token/code-id-token.authorization-context';
import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { Client } from '../../../entities/client';
import { Grant } from '../../../entities/grant';
import { Scope } from '../../../entities/scope';
import { Session } from '../../../entities/session';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { HttpRequestMethod } from '../../../http/request/http-request-method.enum';
import { Logger } from '../../../loggers/logger';
import { PKCE } from '../../../pkces/pkce';
import { PKCEName } from '../../../pkces/pkce-name.type';
import { CodeIdTokenAuthorizationRequest } from '../../../requests/authorization/code-id-token/code-id-token.authorization-request';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { Settings } from '../../../settings/settings';
import { addParametersToUrl } from '../../../utils/add-parameters-to-url/add-parameters-to-url';
import { AuthorizationValidator } from '../authorization.validator';
import { CodeIdTokenAuthorizationValidator } from './code-id-token.authorization.validator';

jest.mock('../../../handlers/scope/scope.handler');
jest.mock('../../../loggers/logger');

const invalidNonces: any[] = [undefined, ''];
const invalidCodeChallenges: any[] = [undefined, ''];

describe('Code & ID Token Authorization Validator', () => {
  let validator: CodeIdTokenAuthorizationValidator;
  const container = getContainer(CONTAINER);

  let superValidateSpy: jest.SpyInstance;

  const loggerMock = jest.mocked(Logger.prototype);
  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findClientById: jest.fn(),
      findSessionById: jest.fn(),
    }),
  );

  const scopeHandlerMock = jest.mocked(ScopeHandler.prototype);

  const settingsMock = jest.mocked<Settings>(
    Object.assign<Settings, Partial<Settings>>(Object.create(Settings.prototype), {
      uiLocales: ['en-US'],
      acrValues: ['urn:guarani:acr:1fa', 'urn:guarani:acr:2fa'],
      minimumMaxAge: 300,
      sessionCookie: '_session',
    }),
  );

  const responseTypeMock = jest.mocked<ResponseType>(
    Object.assign<ResponseType, Partial<ResponseType>>(Reflect.construct(ResponseType, []), {
      name: 'code id_token',
      defaultResponseMode: 'fragment',
    }),
  );

  const responseModeMock = jest.mocked<ResponseMode>(
    Object.assign<ResponseMode, Partial<ResponseMode>>(Reflect.construct(ResponseMode, []), { name: 'form_post' }),
  );

  const displayMock = jest.mocked<Display>(
    Object.assign<Display, Partial<Display>>(Reflect.construct(Display, []), { name: 'popup' }),
  );

  const pkceMock = jest.mocked<PKCE>(Object.assign<PKCE, Partial<PKCE>>(Reflect.construct(PKCE, []), { name: 'S256' }));

  const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
    id: 'client_id',
    redirectUris: [new URL('https://client.example.com/oidc/callback')],
    responseTypes: ['code id_token'],
    scopes: ['openid', 'foo', 'bar', 'baz', 'qux'].map((scope) =>
      Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope }),
    ),
  });

  beforeEach(() => {
    superValidateSpy = jest.spyOn(AuthorizationValidator.prototype, 'validate');

    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ScopeHandler).toValue(scopeHandlerMock);
    container.bind(Settings).toValue(settingsMock);
    container.bind(ResponseType).toValue(responseTypeMock);
    container.bind(ResponseMode).toValue(responseModeMock);
    container.bind(Display).toValue(displayMock);
    container.bind(PKCE).toValue(pkceMock);
    container.bind(CodeIdTokenAuthorizationValidator).toSelf().asSingleton();

    validator = container.resolve(CodeIdTokenAuthorizationValidator);
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('name', () => {
    it('should have "code id_token" as its value.', () => {
      expect(validator.name).toBe<ResponseTypeName>('code id_token');
    });
  });

  describe('forbiddenResponseModes', () => {
    it('should have ["query"] as its value.', () => {
      expect(validator['forbiddenResponseModes']).toStrictEqual<ResponseModeName[]>(['query']);
    });
  });

  describe('constructor', () => {
    it('should be an instance of the Authorization Validator.', () => {
      expect(Object.getPrototypeOf(CodeIdTokenAuthorizationValidator)).toBe(AuthorizationValidator);
    });
  });

  describe('validate()', () => {
    let parameters: CodeIdTokenAuthorizationRequest;
    let requestedScopes: Scope[];

    const requestFactory = (data: Partial<CodeIdTokenAuthorizationRequest> = {}): HttpRequest => {
      removeNullishValues<CodeIdTokenAuthorizationRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: HttpRequestMethod.GET,
        url: addParametersToUrl('https://provider.example.com/oidc/authorization', parameters),
      });
    };

    beforeEach(() => {
      parameters = {
        response_type: 'code id_token',
        client_id: 'client_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
        code_challenge: 'qoJXAtQ-gjzfDmoMrHt1a2AFVe1Tn3-HX0VC2_UtezA',
        code_challenge_method: 'S256',
        scope: 'openid foo bar baz',
        state: 'client_state',
        response_mode: 'form_post',
        nonce: 'client_nonce',
        display: 'popup',
        prompt: 'consent',
        max_age: '300',
        ui_locales: 'en-US',
        id_token_hint: 'id_token_hint',
        login_hint: 'login_hint',
        acr_values: 'urn:guarani:acr:2fa urn:guarani:acr:1fa',
      };

      requestedScopes = parameters.scope
        .split(' ')
        .map((scope) => Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope }));
    });

    it('should throw when the provied parameter "scope" is missing the Scope "openid".', async () => {
      const request = requestFactory({ scope: 'foo bar baz' });

      const requestedScopes = ['foo', 'bar', 'baz'].map((scope) => {
        return Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope });
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Missing required Scope "openid".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CodeIdTokenAuthorizationValidator] Missing required Scope "openid"',
        '0519720b-d7c3-4edb-9860-4b52dfe24bb9',
        { parameters, client_id: client.id },
        error,
      );
    });

    it.each(invalidNonces)('should throw when the provied parameter "nonce" is invalid.', async (nonce) => {
      const request = requestFactory({ nonce });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Invalid parameter "nonce".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CodeIdTokenAuthorizationValidator] Invalid parameter "nonce"',
        '43bac8b4-976b-4f64-b83d-9c24496d70d8',
        { parameters },
        error,
      );
    });

    it.each(invalidCodeChallenges)(
      'should throw when the provided parameter "code_challenge" is invalid.',
      async (codeChallenge) => {
        const request = requestFactory({ code_challenge: codeChallenge });
        request.cookies[settingsMock.sessionCookie] = 'session_id';

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
          id: 'grant_id',
          parameters,
          expiresAt: new Date(Date.now() + 86400),
          client,
        });

        const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
          id: 'session_id',
          grant,
        });

        dataAccessMock.findClientById.mockResolvedValueOnce(client);
        dataAccessMock.findSessionById.mockResolvedValueOnce(session);
        scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

        const error = new InvalidRequestError('Invalid parameter "code_challenge".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[CodeIdTokenAuthorizationValidator] Invalid parameter "code_challenge"',
          '167ff4fb-5c1b-4326-b1ac-8f88d166f80a',
          { parameters },
          error,
        );
      },
    );

    it('should throw when the provided parameter "code_challenge_method" is invalid.', async () => {
      const request = requestFactory({ code_challenge_method: '' as PKCEName });
      request.cookies[settingsMock.sessionCookie] = 'session_id';

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters,
        expiresAt: new Date(Date.now() + 86400),
        client,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        grant,
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      dataAccessMock.findSessionById.mockResolvedValueOnce(session);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Invalid parameter "code_challenge_method".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CodeIdTokenAuthorizationValidator] Invalid parameter "code_challenge_method"',
        '76858191-8ba9-4c96-b078-0f90389557a6',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "code_challenge_method" is unsupported.', async () => {
      const request = requestFactory({ code_challenge_method: 'unknown' as PKCEName });
      request.cookies[settingsMock.sessionCookie] = 'session_id';

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters,
        expiresAt: new Date(Date.now() + 86400),
        client,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        grant,
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      dataAccessMock.findSessionById.mockResolvedValueOnce(session);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Unsupported Code Challenge Method "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CodeIdTokenAuthorizationValidator] Unsupported Code Challenge Method "unknown"',
        '1d98304a-401c-48b5-a284-fc16446ec395',
        { parameters },
        error,
      );
    });

    it('should return a Code & ID Token Authorization Context.', async () => {
      const request = requestFactory();
      request.cookies[settingsMock.sessionCookie] = 'session_id';

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters,
        expiresAt: new Date(Date.now() + 86400),
        client,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        grant,
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      dataAccessMock.findSessionById.mockResolvedValueOnce(session);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      await expect(validator.validate(request)).resolves.toMatchObject<CodeIdTokenAuthorizationContext>({
        parameters,
        responseType: responseTypeMock,
        client,
        redirectUri: client.redirectUris[0]!,
        scopes: requestedScopes,
        state: 'client_state',
        responseMode: responseModeMock,
        nonce: 'client_nonce',
        display: displayMock,
        prompts: ['consent'],
        maxAge: 300,
        uiLocales: ['en-US'],
        idTokenHint: 'id_token_hint',
        loginHint: 'login_hint',
        acrValues: ['urn:guarani:acr:2fa', 'urn:guarani:acr:1fa'],
        session,
        codeChallenge: 'qoJXAtQ-gjzfDmoMrHt1a2AFVe1Tn3-HX0VC2_UtezA',
        codeChallengeMethod: pkceMock,
      });
    });

    it('should return a Code & ID Token Authorization Context with the default PKCE.', async () => {
      const request = requestFactory({ code_challenge_method: undefined as any });
      request.cookies[settingsMock.sessionCookie] = 'session_id';

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters,
        expiresAt: new Date(Date.now() + 86400),
        client,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        grant,
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      dataAccessMock.findSessionById.mockResolvedValueOnce(session);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      await expect(validator.validate(request)).resolves.toMatchObject<CodeIdTokenAuthorizationContext>({
        parameters,
        responseType: responseTypeMock,
        client,
        redirectUri: client.redirectUris[0]!,
        scopes: requestedScopes,
        state: 'client_state',
        responseMode: responseModeMock,
        nonce: 'client_nonce',
        display: displayMock,
        prompts: ['consent'],
        maxAge: 300,
        uiLocales: ['en-US'],
        idTokenHint: 'id_token_hint',
        loginHint: 'login_hint',
        acrValues: ['urn:guarani:acr:2fa', 'urn:guarani:acr:1fa'],
        session,
        codeChallenge: 'qoJXAtQ-gjzfDmoMrHt1a2AFVe1Tn3-HX0VC2_UtezA',
        codeChallengeMethod: pkceMock,
      });
    });
  });
});
