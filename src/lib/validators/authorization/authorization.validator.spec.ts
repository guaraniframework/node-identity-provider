import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer, Injectable, InjectAll } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CONTAINER } from '../../constants';
import { AuthorizationContext } from '../../context/authorization/authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { Display } from '../../displays/display';
import { DisplayName } from '../../displays/display-name.type';
import { EndpointName } from '../../endpoints/endpoint-name.type';
import { Client } from '../../entities/client';
import { Grant } from '../../entities/grant';
import { Scope } from '../../entities/scope';
import { Session } from '../../entities/session';
import { AccessDeniedError } from '../../errors/access-denied/access-denied.error';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { InvalidScopeError } from '../../errors/invalid-scope/invalid-scope.error';
import { MethodNotAllowedError } from '../../errors/method-not-allowed/method-not-allowed.error';
import { UnauthorizedClientError } from '../../errors/unauthorized-client/unauthorized-client.error';
import { ScopeHandler } from '../../handlers/scope/scope.handler';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { Logger } from '../../loggers/logger';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { ResponseMode } from '../../response-modes/response-mode';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { ResponseType } from '../../response-types/response-type';
import { ResponseTypeName } from '../../response-types/response-type-name.type';
import { Settings } from '../../settings/settings';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { AuthorizationValidator } from './authorization.validator';

jest.mock('../../handlers/scope/scope.handler');
jest.mock('../../loggers/logger');

@Injectable()
class CustomAuthorizationValidator extends AuthorizationValidator {
  public readonly name: ResponseTypeName = 'code';
  protected readonly forbiddenResponseModes: ResponseModeName[] = ['fragment'];
  public constructor(
    logger: Logger,
    dataAccess: DataAccess,
    scopeHandler: ScopeHandler,
    settings: Settings,
    @InjectAll(ResponseType) responseTypes: ResponseType[],
    @InjectAll(ResponseMode) responseModes: ResponseMode[],
    @InjectAll(Display) displays: Display[],
  ) {
    super(logger, dataAccess, scopeHandler, settings, responseTypes, responseModes, displays);
  }
}

const invalidHttpRequestMethods: HttpRequestMethod[] = [HttpRequestMethod.DELETE, HttpRequestMethod.PUT];
const invalidClientIds: any[] = [undefined, ''];
const invalidRedirectURIs: any[] = [undefined, '', 'a'];
const invalidScopes: any[] = [undefined, ''];
const invalidMaxAges: any[] = ['', 'a', '0x12', '07', '-1', '-0x12', '-07'];

const invalidSessionIds: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [],
  '',
];

const mismatchingClientIds: string[] = ['other_client_id', 'id_client'];

describe('Authorization Validator', () => {
  let validator: CustomAuthorizationValidator;
  const container = getContainer(CONTAINER);

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

  const responseTypeMocks = [
    jest.mocked<ResponseType>(
      Object.assign<ResponseType, Partial<ResponseType>>(Reflect.construct(ResponseType, []), {
        name: 'code',
        defaultResponseMode: 'query',
      }),
    ),
    jest.mocked<ResponseType>(
      Object.assign<ResponseType, Partial<ResponseType>>(Reflect.construct(ResponseType, []), {
        name: 'token',
        defaultResponseMode: 'fragment',
      }),
    ),
  ];

  const responseModeMocks = [
    jest.mocked<ResponseMode>(
      Object.assign<ResponseMode, Partial<ResponseMode>>(Reflect.construct(ResponseMode, []), { name: 'form_post' }),
    ),
    jest.mocked<ResponseMode>(
      Object.assign<ResponseMode, Partial<ResponseMode>>(Reflect.construct(ResponseMode, []), { name: 'fragment' }),
    ),
    jest.mocked<ResponseMode>(
      Object.assign<ResponseMode, Partial<ResponseMode>>(Reflect.construct(ResponseMode, []), { name: 'query' }),
    ),
  ];

  const displayMocks = [
    jest.mocked<Display>(Object.assign<Display, Partial<Display>>(Reflect.construct(Display, []), { name: 'page' })),
    jest.mocked<Display>(Object.assign<Display, Partial<Display>>(Reflect.construct(Display, []), { name: 'popup' })),
  ];

  const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
    id: 'client_id',
    redirectUris: [new URL('https://client.example.com/oidc/callback')],
    responseTypes: ['code'],
    scopes: ['openid', 'foo', 'bar', 'baz', 'qux'].map((scope) =>
      Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope }),
    ),
  });

  const tokenClient: Client = Object.assign<Client, Partial<Client>>(new Client(), {
    id: 'client_id',
    redirectUris: [new URL('https://client.example.com/oidc/callback')],
    responseTypes: ['token'],
    scopes: ['openid', 'foo', 'bar', 'baz', 'qux'].map((scope) =>
      Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope }),
    ),
  });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ScopeHandler).toValue(scopeHandlerMock);
    container.bind(Settings).toValue(settingsMock);
    responseTypeMocks.forEach((responseTypeMock) => container.bind(ResponseType).toValue(responseTypeMock));
    responseModeMocks.forEach((responseModeMock) => container.bind(ResponseMode).toValue(responseModeMock));
    displayMocks.forEach((displayMock) => container.bind(Display).toValue(displayMock));
    container.bind(CustomAuthorizationValidator).toSelf().asSingleton();

    validator = container.resolve(CustomAuthorizationValidator);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('endpoint', () => {
    it('should have "authorization" as its value.', () => {
      expect(validator.endpoint).toBe<EndpointName>('authorization');
    });
  });

  describe('supportedHttpRequestMethods', () => {
    it('should have ["GET", "POST"] as its value.', () => {
      expect(validator.supportedHttpRequestMethods).toStrictEqual<HttpRequestMethod[]>([
        HttpRequestMethod.GET,
        HttpRequestMethod.POST,
      ]);
    });
  });

  describe('validate()', () => {
    let parameters: AuthorizationRequest;
    let requestedScopes: Scope[];

    const requestFactory = (method: HttpRequestMethod, data: Partial<AuthorizationRequest> = {}): HttpRequest => {
      removeNullishValues<AuthorizationRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters)),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method,
        url: addParametersToUrl('https://provider.example.com/oidc/authorization', parameters),
      });
    };

    beforeEach(() => {
      parameters = {
        response_type: 'code',
        client_id: 'client_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
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

    it.each(invalidHttpRequestMethods)(
      'should throw when the requested Http Request Method is invalid.',
      async (method) => {
        const request = new HttpRequest({
          body: Buffer.alloc(0),
          cookies: {},
          headers: {},
          method,
          url: addParametersToUrl('https://provider.example.com/oidc/authorization', parameters),
        });

        const error = new MethodNotAllowedError(
          `The Authorization Endpoint does not support the Http Request Method "${method}".`,
        );

        await expect(validator.validate(request)).rejects.toThrowWithMessage(MethodNotAllowedError, error.description);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          `[CustomAuthorizationValidator] The Authorization Endpoint does not support the Http Request Method "${method}"`,
          '817c032b-b400-43cd-8c7a-666ab335236c',
          { request },
          error,
        );
      },
    );

    it.each(invalidClientIds)('should throw when the provided parameter "client_id" is invalid.', async (clientId) => {
      const request = requestFactory(HttpRequestMethod.POST, { client_id: clientId });

      const error = new InvalidRequestError('Invalid parameter "client_id".', { fatal: true });
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Invalid parameter "client_id"',
        '354773d7-7a99-444e-ad50-35169865970e',
        { parameters },
        error,
      );
    });

    it('should throw when the Client fails to authenticate.', async () => {
      const request = requestFactory(HttpRequestMethod.GET);

      dataAccessMock.findClientById.mockResolvedValueOnce(null);

      const error = new InvalidClientError('Failed to authenticate the Client.', { fatal: true });
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidClientError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Failed to authenticate the Client',
        'd38c51c7-35d0-4c3a-8667-af25e4184991',
        { parameters },
        error,
      );
    });

    it.each(invalidRedirectURIs)(
      'should throw when the provided parameter "redirect_uri" is invalid.',
      async (redirectUri) => {
        const request = requestFactory(HttpRequestMethod.GET, { redirect_uri: redirectUri });

        dataAccessMock.findClientById.mockResolvedValueOnce(client);

        const error = new InvalidRequestError('Invalid parameter "redirect_uri".', { fatal: true });
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[CustomAuthorizationValidator] Invalid parameter "redirect_uri"',
          '2640d903-baf0-47e7-a420-56972f111aa2',
          { parameters, client_id: client.id },
          error,
        );
      },
    );

    it('should throw when the provided Redirect URI has a fragment component.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, {
        redirect_uri: 'https://client.example.com/oidc/callback#foo=bar',
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('The Redirect URI must not have a fragment component.', { fatal: true });
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] The Redirect URI must not have a fragment component',
        'eb620184-39a8-4af4-ba60-7b4dace21448',
        { parameters, client_id: client.id, redirect_uri: parameters.redirect_uri },
        error,
      );
    });

    it('should throw when the Client is not allowed to use the requested Redirect URI.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, {
        redirect_uri: 'https://client.example.org/oidc/callback',
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      const error = new AccessDeniedError('Invalid Redirect URI.', { fatal: true });
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Invalid Redirect URI',
        '484f7e9a-dbab-4d47-b2c7-1d7c4351f2e9',
        { parameters, client_id: client.id, redirect_uri: parameters.redirect_uri },
        error,
      );
    });

    it('should throw when the Client is not allowed to use the requested Response Type.', async () => {
      const request = requestFactory(HttpRequestMethod.GET);

      dataAccessMock.findClientById.mockResolvedValueOnce(tokenClient);

      const error = new UnauthorizedClientError('The Client is not allowed to request the Response Type "code".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(UnauthorizedClientError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] The Client is not allowed to request the Response Type "code"',
        'abfa0812-dd05-4784-9c52-d8c1ed2c9be2',
        { parameters, client_id: tokenClient.id },
        error,
      );
    });

    it.each(invalidScopes)('should throw when the provided parameter "scope" is invalid.', async (scope) => {
      const request = requestFactory(HttpRequestMethod.GET, { scope });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "scope".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Invalid parameter "scope"',
        '73f82992-2002-4283-b63e-53c50e8cae6d',
        { parameters, client_id: client.id },
        error,
      );
    });

    it('should throw when failing to check the requested Scopes.', async () => {
      const request = requestFactory(HttpRequestMethod.GET);

      const error = new InvalidScopeError('Unsupported Scope "foo".');

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.checkRequestedScopes.mockRejectedValueOnce(error);

      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidScopeError, error.description);

      expect(scopeHandlerMock.checkRequestedScopes).toHaveBeenCalledExactlyOnceWith(parameters.scope.split(' '));
    });

    it('should throw when the Client is not allowed to use the requested Scopes.', async () => {
      const request = requestFactory(HttpRequestMethod.GET);

      const error = new AccessDeniedError('The Client is not allowed to request the Scope "foo".');

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockRejectedValueOnce(error);

      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(scopeHandlerMock.checkRequestedScopes).toHaveBeenCalledExactlyOnceWith(parameters.scope.split(' '));
      expect(scopeHandlerMock.getAllowedScopes).toHaveBeenCalledExactlyOnceWith(client, parameters.scope.split(' '));
    });

    it('should throw when the provided parameter "state" is invalid.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { state: '' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Invalid parameter "state".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Invalid parameter "state"',
        'ef2ba2e4-3845-4741-9212-195d5f423435',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "response_mode" is invalid.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { response_mode: '' as ResponseModeName });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Invalid parameter "response_mode".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Invalid parameter "response_mode"',
        'da4f691c-0b44-4f0e-b8b5-38c85eeb5526',
        { parameters, response_type: parameters.response_type },
        error,
      );
    });

    it('should throw when the provided parameter "response_mode" is unsupported.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { response_mode: 'unknown' as ResponseModeName });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Unsupported Response Mode "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Unsupported Response Mode "unknown"',
        'f7d16e6e-6bcf-4717-93da-4a5c3a414e8e',
        { parameters, response_type: parameters.response_type },
        error,
      );
    });

    it('should throw when the provided parameter "response_mode" is forbidden.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { response_mode: 'fragment' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Invalid Response Mode "fragment" for Response Type "code".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Invalid Response Mode "fragment" for Response Type "code"',
        '646bfec8-899d-4dd3-a3ce-8e602f5b1fcf',
        { parameters, response_type: parameters.response_type },
        error,
      );
    });

    it('should throw when the provided parameter "nonce" is invalid.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { nonce: '' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Invalid parameter "nonce".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Invalid parameter "nonce"',
        '29c978fa-715b-4b97-bba2-41da9a8ef260',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "display" is invalid.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { display: '' as DisplayName });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Invalid parameter "display".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Invalid parameter "display"',
        'c79671f1-b7b3-42f2-b4fc-f9e1e2c88c5a',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "display" is unsupported.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { display: 'unknown' as DisplayName });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Unsupported Display "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Unsupported Display "unknown"',
        '739cd367-963d-4e9c-841b-43647f3520f8',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "prompt" is invalid.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { prompt: '' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Invalid parameter "prompt".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Invalid parameter "prompt"',
        '1334c26c-89d2-4595-9355-faf21f340c9d',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "prompt" is unsupported.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { prompt: 'login unknown consent' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Unsupported Prompt "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Unsupported Prompt "unknown"',
        '1e94b0f2-ba3d-4bda-80cc-be274446a2c6',
        { parameters },
        error,
      );
    });

    it('should throw when not requesting the Prompt "none" by itself.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { prompt: 'login none' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('The Prompt "none" must be used by itself.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] The Prompt "none" must be used by itself',
        'c41b5e53-b4fb-4aef-80c4-14b989fc72ae',
        { parameters, prompts: ['login', 'none'] },
        error,
      );
    });

    it('should throw when requesting the Prompts "create" and "login" together.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { prompt: 'create login' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('The Prompts "create" and "login" cannot be used together.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] The Prompts "create" and "login" cannot be used together',
        '68dc7d50-1ce6-43fd-b96b-98c51427fa00',
        { parameters, prompts: ['create', 'login'] },
        error,
      );
    });

    it('should throw when requesting the Prompts "create" and "select_account" together.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { prompt: 'create select_account' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('The Prompts "create" and "select_account" cannot be used together.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] The Prompts "create" and "select_account" cannot be used together',
        '68479db2-699b-4995-9b3e-3539bab00be1',
        { parameters, prompts: ['create', 'select_account'] },
        error,
      );
    });

    it('should throw when requesting the Prompts "login" and "select_account" together.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { prompt: 'login select_account' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('The Prompts "login" and "select_account" cannot be used together.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] The Prompts "login" and "select_account" cannot be used together',
        '4320e86d-d99d-45f4-a93e-48def43ff4b9',
        { parameters, prompts: ['login', 'select_account'] },
        error,
      );
    });

    it.each(invalidMaxAges)('should throw when the provided parameter "max_age" is invalid.', async (maxAge) => {
      const request = requestFactory(HttpRequestMethod.GET, { max_age: maxAge });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Invalid parameter "max_age".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Invalid parameter "max_age"',
        '73706208-2ad3-4568-8801-23289008a6db',
        { parameters },
        error,
      );
    });

    it('should throw when the provided Max Age is smaller than the allowed by the Identity Provider.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { max_age: '1' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError(
        'The provided Max Age is smaller than the allowed by the Identity Provider.',
      );

      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] The provided Max Age is smaller than the allowed by the Identity Provider',
        '05a81fec-1ffb-4b07-8aa6-342e09b6ae8b',
        { parameters },
        error,
      );
    });

    it('should throw when the provided Max Age is smaller than the default allowed by the Identity Provider.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { max_age: '1' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError(
        'The provided Max Age is smaller than the allowed by the Identity Provider.',
      );

      Reflect.deleteProperty(settingsMock, 'minimumMaxAge');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);
      Reflect.set(settingsMock, 'minimumMaxAge', 300);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] The provided Max Age is smaller than the allowed by the Identity Provider',
        '05a81fec-1ffb-4b07-8aa6-342e09b6ae8b',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "ui_locales" is invalid.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { ui_locales: '' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Invalid parameter "ui_locales".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Invalid parameter "ui_locales"',
        '57d51d19-e2ba-4e21-a852-17c454985d9d',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "ui_locales" is unsupported.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { ui_locales: 'en-US unknown' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Unsupported UI Locale "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Unsupported UI Locale "unknown"',
        'f53991a0-2891-4155-ac41-dec761a4d6ca',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "id_token_hint" is invalid.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { id_token_hint: '' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Invalid parameter "id_token_hint".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Invalid parameter "id_token_hint"',
        '85e4ddc3-7d7a-415e-b541-d2390fc95c8a',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "login_hint" is invalid.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { login_hint: '' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Invalid parameter "login_hint".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Invalid parameter "login_hint"',
        'e9ced8cc-cf96-4030-b64b-ea8db978e373',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "acr_values" is invalid.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { acr_values: '' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Invalid parameter "acr_values".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Invalid parameter "acr_values"',
        '867e564f-2ce6-44b7-86f7-12bf02dd81c4',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "acr_values" is unsupported.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { acr_values: 'urn:guarani:acr:2fa unknown' });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Unsupported Authentication Context Class Reference "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Unsupported Authentication Context Class Reference "unknown"',
        '7e7b042d-417d-4398-bbd7-0c6bb19898f6',
        { parameters },
        error,
      );
    });

    it.each(invalidSessionIds)('should throw when the Session Id in the Cookies is invalid.', async (sessionId) => {
      const request = requestFactory(HttpRequestMethod.GET);
      request.cookies[settingsMock.sessionCookie] = sessionId;

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Failed to authenticate the Client.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        `[CustomAuthorizationValidator] The Cookie "${settingsMock.sessionCookie}" must be a non-empty string`,
        '91c667dc-17f2-4cd8-8810-04b72382d109',
        { cookies: request.cookies },
        error,
      );
    });

    it.each(mismatchingClientIds)(
      "should throw when the Client Id and the Grant's Client Id do not match.",
      async (clientId) => {
        const request = requestFactory(HttpRequestMethod.GET);
        request.cookies[settingsMock.sessionCookie] = 'session_id';

        const grantClient: Client = Object.assign<Client, Partial<Client>>(new Client(), {
          id: clientId,
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
          id: 'grant_id',
          client: grantClient,
        });

        const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
          id: 'session_id',
          grant,
        });

        dataAccessMock.findClientById.mockResolvedValueOnce(client);
        dataAccessMock.findSessionById.mockResolvedValueOnce(session);
        scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

        const error = new InvalidRequestError('Invalid Grant.');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[CustomAuthorizationValidator] Invalid Grant',
          '2fb222ee-bc9c-4d8f-9d5c-92582e56ec7d',
          { grant, client_id: client.id, parameters },
          error,
        );
      },
    );

    it('should throw when the Grant is expired.', async () => {
      const request = requestFactory(HttpRequestMethod.GET);
      request.cookies[settingsMock.sessionCookie] = 'session_id';

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() - 86400),
        client,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        grant,
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      dataAccessMock.findSessionById.mockResolvedValueOnce(session);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('Expired Grant.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] Expired Grant',
        'b4efe738-033e-4041-9d87-2921f2185276',
        { grant, client_id: client.id, parameters },
        error,
      );
    });

    it('should throw when the Authorization Request Parameters of the Grant do not match the provided Authorization Request Parameters.', async () => {
      const request = requestFactory(HttpRequestMethod.GET);
      request.cookies[settingsMock.sessionCookie] = 'session_id';

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: { ...parameters, nonce: 'another_nonce' },
        expiresAt: new Date(Date.now() + 86400),
        client,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        grant,
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      dataAccessMock.findSessionById.mockResolvedValueOnce(session);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      const error = new InvalidRequestError('One or more parameters changed since the initial Authorization Request.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationValidator] One or more parameters changed since the initial Authorization Request',
        '80670caa-b8b3-4bd9-84bf-0b4a496c4169',
        { grant, client_id: client.id, parameters },
        error,
      );
    });

    it('should return an Authorization Context without the "offline_access" Scope if not requested together with the "consent" Prompt.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { prompt: undefined as any });

      const scopes = ['openid', 'foo', 'bar', 'baz', 'offline_access'].map((scope) => {
        return Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope });
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      dataAccessMock.findSessionById.mockResolvedValueOnce(null);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(scopes);

      await expect(validator.validate(request)).resolves.toMatchObject<AuthorizationContext>({
        parameters,
        responseType: responseTypeMocks[0]!,
        client,
        redirectUri: client.redirectUris[0]!,
        scopes: scopes.filter((scope) => scope.name !== 'offline_access'),
        state: 'client_state',
        responseMode: responseModeMocks[0]!,
        nonce: 'client_nonce',
        display: displayMocks[1]!,
        prompts: [],
        maxAge: 300,
        uiLocales: ['en-US'],
        idTokenHint: 'id_token_hint',
        loginHint: 'login_hint',
        acrValues: ['urn:guarani:acr:2fa', 'urn:guarani:acr:1fa'],
        session: null,
      });

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[CustomAuthorizationValidator] Removing "offline_access" scope',
        '72b2b93c-21bb-449c-a032-dfde4ecfd007',
        { scopes: scopes.map((scope) => scope.name), prompts: [], response_type: responseTypeMocks[0]!.name },
      );
    });

    it('should return an Authorization Context without the "offline_access" Scope if not requested together with a "code" Response Type.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, { response_type: 'token' });
      request.cookies[settingsMock.sessionCookie] = 'session_id';

      const scopes = ['openid', 'foo', 'bar', 'baz', 'offline_access'].map((scope) => {
        return Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope });
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(tokenClient);
      dataAccessMock.findSessionById.mockResolvedValueOnce(null);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(scopes);

      await expect(validator.validate(request)).resolves.toMatchObject<AuthorizationContext>({
        parameters,
        responseType: responseTypeMocks[1]!,
        client: tokenClient,
        redirectUri: client.redirectUris[0]!,
        scopes: scopes.filter((scope) => scope.name !== 'offline_access'),
        state: 'client_state',
        responseMode: responseModeMocks[0]!,
        nonce: 'client_nonce',
        display: displayMocks[1]!,
        prompts: ['consent'],
        maxAge: 300,
        uiLocales: ['en-US'],
        idTokenHint: 'id_token_hint',
        loginHint: 'login_hint',
        acrValues: ['urn:guarani:acr:2fa', 'urn:guarani:acr:1fa'],
        session: null,
      });

      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[CustomAuthorizationValidator] Removing "offline_access" scope',
        '72b2b93c-21bb-449c-a032-dfde4ecfd007',
        { scopes: scopes.map((scope) => scope.name), prompts: ['consent'], response_type: responseTypeMocks[1]!.name },
      );
    });

    it('should return an Authorization Context with default values for parameters not provided.', async () => {
      const request = requestFactory(HttpRequestMethod.GET, {
        state: undefined as any,
        response_mode: undefined as any,
        nonce: undefined as any,
        display: undefined as any,
        prompt: undefined as any,
        max_age: undefined as any,
        ui_locales: undefined as any,
        id_token_hint: undefined as any,
        login_hint: undefined as any,
        acr_values: undefined as any,
      });

      request.cookies[settingsMock.sessionCookie] = 'session_id';

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters,
        expiresAt: new Date(Date.now() + 86400),
        client,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        grant,
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      dataAccessMock.findSessionById.mockResolvedValueOnce(session);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      await expect(validator.validate(request)).resolves.toMatchObject<AuthorizationContext>({
        parameters,
        responseType: responseTypeMocks[0]!,
        client,
        redirectUri: client.redirectUris[0]!,
        scopes: requestedScopes,
        state: null,
        responseMode: responseModeMocks[2]!,
        nonce: null,
        display: displayMocks[0]!,
        prompts: [],
        maxAge: null,
        uiLocales: [],
        idTokenHint: null,
        loginHint: null,
        acrValues: [],
        session,
      });
    });

    it('should return an Authorization Context.', async () => {
      const request = requestFactory(HttpRequestMethod.GET);
      request.cookies[settingsMock.sessionCookie] = 'session_id';

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters,
        expiresAt: new Date(Date.now() + 86400),
        client,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        grant,
      });

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
      dataAccessMock.findSessionById.mockResolvedValueOnce(session);
      scopeHandlerMock.getAllowedScopes.mockResolvedValueOnce(requestedScopes);

      await expect(validator.validate(request)).resolves.toMatchObject<AuthorizationContext>({
        parameters,
        responseType: responseTypeMocks[0]!,
        client,
        redirectUri: client.redirectUris[0]!,
        scopes: requestedScopes,
        state: 'client_state',
        responseMode: responseModeMocks[0]!,
        nonce: 'client_nonce',
        display: displayMocks[1]!,
        prompts: ['consent'],
        maxAge: 300,
        uiLocales: ['en-US'],
        idTokenHint: 'id_token_hint',
        loginHint: 'login_hint',
        acrValues: ['urn:guarani:acr:2fa', 'urn:guarani:acr:1fa'],
        session,
      });
    });
  });
});
