import { Buffer } from 'buffer';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CONTAINER } from '../../../constants';
import { CodeIdTokenTokenAuthorizationContext } from '../../../context/authorization/code-id-token-token/code-id-token-token.authorization-context';
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
import { CodeIdTokenTokenAuthorizationRequest } from '../../../requests/authorization/code-id-token-token/code-id-token-token.authorization-request';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { Settings } from '../../../settings/settings';
import { addParametersToUrl } from '../../../utils/add-parameters-to-url/add-parameters-to-url';
import { AuthorizationValidator } from '../authorization.validator';
import { CodeIdTokenTokenAuthorizationValidator } from './code-id-token-token.authorization.validator';

jest.mock('../../../handlers/scope/scope.handler');
jest.mock('../../../loggers/logger');

const invalidNonces: any[] = [undefined, ''];
const invalidCodeChallenges: any[] = [undefined, ''];

describe('Code & ID Token & Token Authorization Validator', () => {
  let validator: CodeIdTokenTokenAuthorizationValidator;
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
      idTokenSignatureAlgorithms: ['ES256'],
      uiLocales: ['en-US'],
      acrValues: ['urn:guarani:acr:1fa', 'urn:guarani:acr:2fa'],
      minimumMaxAge: 300,
      sessionCookie: '_session',
    }),
  );

  const responseTypeMock = jest.mocked<ResponseType>(
    Object.assign<ResponseType, Partial<ResponseType>>(Reflect.construct(ResponseType, []), {
      name: 'code id_token token',
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
    responseTypes: ['code id_token token'],
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
    container.bind(CodeIdTokenTokenAuthorizationValidator).toSelf().asSingleton();

    validator = container.resolve(CodeIdTokenTokenAuthorizationValidator);
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('name', () => {
    it('should have "code id_token token" as its value.', () => {
      expect(validator.name).toBe<ResponseTypeName>('code id_token token');
    });
  });

  describe('forbiddenResponseModes', () => {
    it('should have ["query"] as its value.', () => {
      expect(validator['forbiddenResponseModes']).toStrictEqual<ResponseModeName[]>(['query']);
    });
  });

  describe('constructor', () => {
    it('should be an instance of the Authorization Validator.', () => {
      expect(Object.getPrototypeOf(CodeIdTokenTokenAuthorizationValidator)).toBe(AuthorizationValidator);
    });
  });

  describe('validate()', () => {
    let parameters: CodeIdTokenTokenAuthorizationRequest;
    let requestedScopes: Scope[];

    const requestFactory = (data: Partial<CodeIdTokenTokenAuthorizationRequest> = {}): HttpRequest => {
      removeNullishValues<CodeIdTokenTokenAuthorizationRequest>(Object.assign(parameters, data));

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
        response_type: 'code id_token token',
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
        '[CodeIdTokenTokenAuthorizationValidator] Missing required Scope "openid"',
        'df69b66b-5ccf-42d2-92fe-c4b37cf62cce',
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
        '[CodeIdTokenTokenAuthorizationValidator] Invalid parameter "nonce"',
        '54a7fb4a-fa79-4283-a5f7-a7ef190a5ee5',
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
          '[CodeIdTokenTokenAuthorizationValidator] Invalid parameter "code_challenge"',
          '799109fc-adc1-4a0b-b444-a6f9f155e6d2',
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
        '[CodeIdTokenTokenAuthorizationValidator] Invalid parameter "code_challenge_method"',
        'd432637d-b084-485f-bf5e-b81419b2df6a',
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
        '[CodeIdTokenTokenAuthorizationValidator] Unsupported Code Challenge Method "unknown"',
        '916044ee-49d8-420c-8870-0c4fae9ba2ad',
        { parameters },
        error,
      );
    });

    it('should return a Code & ID Token & Token Authorization Context.', async () => {
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

      await expect(validator.validate(request)).resolves.toMatchObject<CodeIdTokenTokenAuthorizationContext>({
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

    it('should return a Code & ID Token & Token Authorization Context with the default PKCE.', async () => {
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

      await expect(validator.validate(request)).resolves.toMatchObject<CodeIdTokenTokenAuthorizationContext>({
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
