import { Buffer } from 'buffer';
import { URL } from 'url';

import { getContainer, Inject, Injectable, InjectAll } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { AuthorizationContext } from '../../context/authorization/authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { Display } from '../../displays/display';
import { DisplayName } from '../../displays/display-name.type';
import { Client } from '../../entities/client';
import { Grant } from '../../entities/grant';
import { Session } from '../../entities/session';
import { AccessDeniedError } from '../../errors/access-denied/access-denied.error';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { UnauthorizedClientError } from '../../errors/unauthorized-client/unauthorized-client.error';
import { ScopeHandler } from '../../handlers/scope/scope.handler';
import { HttpRequest } from '../../http/request/http-request';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { ResponseMode } from '../../response-modes/response-mode';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { ResponseType } from '../../response-types/response-type';
import { ResponseTypeName } from '../../response-types/response-type-name.type';
import { type Settings } from '../../settings/settings';
import { SETTINGS } from '../../settings/settings.token';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { AuthorizationRequestValidator } from './authorization-request.validator';

jest.mock('../../handlers/scope/scope.handler');
jest.mock('../../logger/logger');

@Injectable()
class CustomAuthorizationRequestValidator extends AuthorizationRequestValidator {
  public readonly name: ResponseTypeName = 'code';
  protected override readonly forbiddenResponseModes: ResponseModeName[] = ['form_post'];
  public constructor(
    logger: Logger,
    scopeHandler: ScopeHandler,
    dataAccess: DataAccess,
    @Inject(SETTINGS) settings: Settings,
    @InjectAll(ResponseType) responseTypes: ResponseType[],
    @InjectAll(ResponseMode) responseModes: ResponseMode[],
    @InjectAll(Display) displays: Display[],
  ) {
    super(logger, scopeHandler, dataAccess, settings, responseTypes, responseModes, displays);
  }
}

const invalidClientIds: any[] = [undefined, ''];
const invalidRedirectURIs: any[] = [undefined, '', 'a'];
const invalidScopes: any[] = [undefined, '', 'foo bar baz'];
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

describe('Authorization Request Validator', () => {
  let validator: AuthorizationRequestValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const scopeHandlerMock = jest.mocked(ScopeHandler.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findClient: jest.fn(),
      findSession: jest.fn(),
    }),
  );

  const settings: Partial<Settings> = {
    uiLocales: ['en', 'pt-BR'],
    acrValues: ['urn:guarani:acr:1fa', 'urn:guarani:acr:2fa'],
    minimumMaxAge: 300,
  };

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
      Object.assign<ResponseMode, Partial<ResponseMode>>(Reflect.construct(ResponseMode, []), { name: 'query' }),
    ),
    jest.mocked<ResponseMode>(
      Object.assign<ResponseMode, Partial<ResponseMode>>(Reflect.construct(ResponseMode, []), { name: 'fragment' }),
    ),
    jest.mocked<ResponseMode>(
      Object.assign<ResponseMode, Partial<ResponseMode>>(Reflect.construct(ResponseMode, []), { name: 'form_post' }),
    ),
  ];

  const displayMocks = [
    jest.mocked<Display>(Object.assign<Display, Partial<Display>>(Reflect.construct(Display, []), { name: 'page' })),
    jest.mocked<Display>(Object.assign<Display, Partial<Display>>(Reflect.construct(Display, []), { name: 'popup' })),
  ];

  const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
    id: 'client_id',
    redirectUris: [new URL('https://client.example.com/oidc/callback')],
    responseTypes: ['code'],
    scopes: ['openid', 'foo', 'bar', 'baz', 'qux'],
  });

  const tokenClient: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
    id: 'client_id',
    redirectUris: [new URL('https://client.example.com/oidc/callback')],
    responseTypes: ['token'],
    scopes: ['openid', 'foo', 'bar', 'baz', 'qux', 'offline_access'],
  });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(ScopeHandler).toValue(scopeHandlerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind<Partial<Settings>>(SETTINGS).toValue(settings);
    responseTypeMocks.forEach((responseTypeMock) => container.bind(ResponseType).toValue(responseTypeMock));
    responseModeMocks.forEach((responseModeMock) => container.bind(ResponseMode).toValue(responseModeMock));
    displayMocks.forEach((displayMock) => container.bind(Display).toValue(displayMock));
    container.bind(AuthorizationRequestValidator).toClass(CustomAuthorizationRequestValidator).asSingleton();

    validator = container.resolve(AuthorizationRequestValidator);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('validate()', () => {
    let parameters!: AuthorizationRequest;

    const requestFactory = (data: Partial<AuthorizationRequest> = {}): HttpRequest => {
      removeNullishValues<AuthorizationRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: 'GET',
        url: addParametersToUrl(new URL('https://idp.example.com/oidc/authorization'), parameters),
      });
    };

    beforeEach(() => {
      parameters = {
        response_type: 'code',
        client_id: 'client_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
        scope: 'openid foo bar baz',
        state: 'client_state',
        response_mode: 'query',
        nonce: 'client_nonce',
        display: 'popup',
        prompt: 'consent',
        max_age: '300',
        ui_locales: 'pt-BR en',
        id_token_hint: 'id_token_hint',
        login_hint: 'login_hint',
        acr_values: 'urn:guarani:acr:2fa urn:guarani:acr:1fa',
      };
    });

    it.each(invalidClientIds)('should throw when the provided parameter "client_id" is invalid.', async (clientId) => {
      const request = requestFactory({ client_id: clientId });
      const error = new InvalidRequestError('Invalid parameter "client_id".');

      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid parameter "client_id"',
        '354773d7-7a99-444e-ad50-35169865970e',
        { parameters },
        error,
      );
    });

    it('should throw when the Client is not registered.', async () => {
      const request = requestFactory();

      dataAccessMock.findClient.mockResolvedValueOnce(null);

      const error = new InvalidClientError('Invalid Client.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidClientError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid Client',
        'd38c51c7-35d0-4c3a-8667-af25e4184991',
        { parameters },
        error,
      );
    });

    it('should throw when the Client is not allowed to request the provided "response_type".', async () => {
      const request = requestFactory();

      dataAccessMock.findClient.mockResolvedValueOnce(tokenClient);

      const error = new UnauthorizedClientError('This Client is not allowed to request the response_type "code".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(UnauthorizedClientError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] This Client is not allowed to request the response_type "code"',
        'abfa0812-dd05-4784-9c52-d8c1ed2c9be2',
        { parameters, client: tokenClient },
        error,
      );
    });

    it.each(invalidRedirectURIs)(
      'should throw when the provided parameter "redirect_uri" is invalid.',
      async (redirectUri) => {
        const request = requestFactory({ redirect_uri: redirectUri });

        dataAccessMock.findClient.mockResolvedValueOnce(client);

        const error = new InvalidRequestError('Invalid parameter "redirect_uri".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[CustomAuthorizationRequestValidator] Invalid parameter "redirect_uri"',
          '2640d903-baf0-47e7-a420-56972f111aa2',
          { parameters, client },
          error,
        );
      },
    );

    it('should throw when the provided "redirect_uri" has a fragment component.', async () => {
      const redirectUri = 'https://client.example.com/oidc/callback#foo=bar';

      const request = requestFactory({ redirect_uri: redirectUri });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('The Redirect URI must not have a fragment component.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] The Redirect URI must not have a fragment component',
        'eb620184-39a8-4af4-ba60-7b4dace21448',
        { parameters, client, redirect_uri: redirectUri },
        error,
      );
    });

    it('should throw when the Client is not allowed to use the provided "redirect_uri".', async () => {
      const request = requestFactory({ redirect_uri: 'https://client.example.org/oidc/callback' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new AccessDeniedError('Invalid Redirect URI.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid Redirect URI',
        '484f7e9a-dbab-4d47-b2c7-1d7c4351f2e9',
        { parameters, client, redirect_uri: parameters.redirect_uri },
        error,
      );
    });

    it.each(invalidScopes)('should throw when the provided parameter "scope" is invalid.', async (scope) => {
      const request = requestFactory({ scope });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "scope".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid parameter "scope"',
        '73f82992-2002-4283-b63e-53c50e8cae6d',
        { parameters, client },
        error,
      );
    });

    it('should throw when the provided parameter "state" is invalid.', async () => {
      const request = requestFactory({ state: '' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "state".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid parameter "state"',
        'ef2ba2e4-3845-4741-9212-195d5f423435',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "response_mode" is invalid.', async () => {
      const request = requestFactory({ response_mode: '' as ResponseModeName });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "response_mode".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid parameter "response_mode"',
        'da4f691c-0b44-4f0e-b8b5-38c85eeb5526',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "response_mode" is unsupported.', async () => {
      const request = requestFactory({ response_mode: 'unknown' as ResponseModeName });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Unsupported response_mode "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Unsupported response_mode "unknown"',
        'f7d16e6e-6bcf-4717-93da-4a5c3a414e8e',
        { parameters, response_type: parameters.response_type, client },
        error,
      );
    });

    it('should throw when the provided parameter "response_mode" is forbidden.', async () => {
      const request = requestFactory({ response_mode: 'form_post' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid response_mode "form_post" for response_type "code".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid response_mode "form_post" for response_type "code"',
        '646bfec8-899d-4dd3-a3ce-8e602f5b1fcf',
        { parameters, response_type: parameters.response_type, client },
        error,
      );
    });

    it('should throw when the provided parameter "nonce" is invalid.', async () => {
      const request = requestFactory({ nonce: '' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "nonce".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid parameter "nonce"',
        '29c978fa-715b-4b97-bba2-41da9a8ef260',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "display" is invalid.', async () => {
      const request = requestFactory({ display: '' as DisplayName });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "display".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid parameter "display"',
        'c79671f1-b7b3-42f2-b4fc-f9e1e2c88c5a',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "display" is unsupported.', async () => {
      const request = requestFactory({ display: 'unknown' as DisplayName });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Unsupported display "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Unsupported display "unknown"',
        '739cd367-963d-4e9c-841b-43647f3520f8',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "prompt" is invalid.', async () => {
      const request = requestFactory({ prompt: '' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "prompt".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid parameter "prompt"',
        '1334c26c-89d2-4595-9355-faf21f340c9d',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "prompt" is unsupported.', async () => {
      const request = requestFactory({ prompt: 'login unknown consent' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Unsupported prompt "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Unsupported prompt "unknown"',
        '1e94b0f2-ba3d-4bda-80cc-be274446a2c6',
        { parameters },
        error,
      );
    });

    it('should throw when not requesting the prompt "none" by itself.', async () => {
      const request = requestFactory({ prompt: 'login none' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('The prompt "none" must be used by itself.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] The prompt "none" must be used by itself',
        'c41b5e53-b4fb-4aef-80c4-14b989fc72ae',
        { parameters, prompts: ['login', 'none'] },
        error,
      );
    });

    it('should throw when requesting the prompts "create" and "login" together.', async () => {
      const request = requestFactory({ prompt: 'create login' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('The prompts "create" and "login" cannot be used together.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] The prompts "create" and "login" cannot be used together',
        '68dc7d50-1ce6-43fd-b96b-98c51427fa00',
        { parameters, prompts: ['create', 'login'] },
        error,
      );
    });

    it('should throw when requesting the prompts "create" and "select_account" together.', async () => {
      const request = requestFactory({ prompt: 'create select_account' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('The prompts "create" and "select_account" cannot be used together.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] The prompts "create" and "select_account" cannot be used together',
        '68479db2-699b-4995-9b3e-3539bab00be1',
        { parameters, prompts: ['create', 'select_account'] },
        error,
      );
    });

    it('should throw when requesting the prompts "login" and "select_account" together.', async () => {
      const request = requestFactory({ prompt: 'login select_account' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('The prompts "login" and "select_account" cannot be used together.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] The prompts "login" and "select_account" cannot be used together',
        '4320e86d-d99d-45f4-a93e-48def43ff4b9',
        { parameters, prompts: ['login', 'select_account'] },
        error,
      );
    });

    it.each(invalidMaxAges)('should throw when the provided parameter "max_age" is invalid.', async (maxAge) => {
      const request = requestFactory({ max_age: maxAge });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "max_age".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid parameter "max_age"',
        '73706208-2ad3-4568-8801-23289008a6db',
        { parameters },
        error,
      );
    });

    it('should throw when the provided "max_age" is smaller than the allowed by the Identity Provider.', async () => {
      const request = requestFactory({ max_age: '1' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError(
        'The provided "max_age" is smaller than the allowed by the Identity Provider.',
      );

      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] The provided "max_age" is smaller than the allowed by the Identity Provider',
        '05a81fec-1ffb-4b07-8aa6-342e09b6ae8b',
        { parameters },
        error,
      );
    });

    it('should throw when the provided "max_age" is smaller than the default allowed by the Identity Provider.', async () => {
      const request = requestFactory({ max_age: '1' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError(
        'The provided "max_age" is smaller than the allowed by the Identity Provider.',
      );

      Reflect.deleteProperty(settings, 'minimumMaxAge');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);
      Reflect.set(settings, 'minimumMaxAge', 300);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] The provided "max_age" is smaller than the allowed by the Identity Provider',
        '05a81fec-1ffb-4b07-8aa6-342e09b6ae8b',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "ui_locales" is invalid.', async () => {
      const request = requestFactory({ ui_locales: '' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "ui_locales".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid parameter "ui_locales"',
        '57d51d19-e2ba-4e21-a852-17c454985d9d',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "ui_locales" is unsupported.', async () => {
      const request = requestFactory({ ui_locales: 'pt-BR unknown' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Unsupported ui_locale "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Unsupported ui_locale "unknown"',
        'f53991a0-2891-4155-ac41-dec761a4d6ca',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "id_token_hint" is invalid.', async () => {
      const request = requestFactory({ id_token_hint: '' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "id_token_hint".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid parameter "id_token_hint"',
        '85e4ddc3-7d7a-415e-b541-d2390fc95c8a',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "login_hint" is invalid.', async () => {
      const request = requestFactory({ login_hint: '' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "login_hint".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid parameter "login_hint"',
        'e9ced8cc-cf96-4030-b64b-ea8db978e373',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "acr_values" is invalid.', async () => {
      const request = requestFactory({ acr_values: '' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "acr_values".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Invalid parameter "acr_values"',
        '867e564f-2ce6-44b7-86f7-12bf02dd81c4',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "acr_values" is unsupported.', async () => {
      const request = requestFactory({ acr_values: 'urn:guarani:acr:2fa unknown' });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Unsupported acr_value "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Unsupported acr_value "unknown"',
        '7e7b042d-417d-4398-bbd7-0c6bb19898f6',
        { parameters },
        error,
      );
    });

    it.each(invalidSessionIds)('should throw when the Session Id in the Cookies is invalid.', async (sessionId) => {
      const request = requestFactory();
      request.cookies['guarani:session'] = sessionId;

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Failed to authenticate the User.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] The Cookie "guarani:session" must be a non-empty string',
        '91c667dc-17f2-4cd8-8810-04b72382d109',
        { cookies: request.cookies },
        error,
      );
    });

    it.each(mismatchingClientIds)(
      "should throw when the Client Id and the Grant's Client Id do not match.",
      async (clientId) => {
        const request = requestFactory();
        request.cookies['guarani:session'] = 'session_id';

        const scopes: string[] = ['foo', 'bar', 'baz'];

        const grantClient: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
          id: clientId,
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
          id: 'grant_id',
          client: grantClient,
        });

        const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
          id: 'session_id',
          grant,
        });

        dataAccessMock.findClient.mockResolvedValueOnce(client);
        dataAccessMock.findSession.mockResolvedValueOnce(session);
        scopeHandlerMock.getAllowedScopes.mockReturnValueOnce(scopes);

        const error = new InvalidRequestError('Invalid Grant.');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[CustomAuthorizationRequestValidator] Invalid Grant',
          '2fb222ee-bc9c-4d8f-9d5c-92582e56ec7d',
          { grant, client, parameters },
          error,
        );
      },
    );

    it('should throw when the Grant is expired.', async () => {
      const request = requestFactory();
      request.cookies['guarani:session'] = 'session_id';

      const scopes: string[] = ['foo', 'bar', 'baz'];

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() - 86400),
        client,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        grant,
      });

      dataAccessMock.findClient.mockResolvedValueOnce(client);
      dataAccessMock.findSession.mockResolvedValueOnce(session);
      scopeHandlerMock.getAllowedScopes.mockReturnValueOnce(scopes);

      const error = new InvalidRequestError('Expired Grant.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] Expired Grant',
        'b4efe738-033e-4041-9d87-2921f2185276',
        { grant, client, parameters },
        error,
      );
    });

    it('should throw when the Authorization Request Parameters of the Grant do not match the provided Authorization Request Parameters.', async () => {
      const request = requestFactory();
      request.cookies['guarani:session'] = 'session_id';

      const scopes: string[] = ['foo', 'bar', 'baz'];

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: { ...parameters, nonce: 'another_nonce' },
        expiresAt: new Date(Date.now() + 86400),
        client,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
        grant,
      });

      dataAccessMock.findClient.mockResolvedValueOnce(client);
      dataAccessMock.findSession.mockResolvedValueOnce(session);
      scopeHandlerMock.getAllowedScopes.mockReturnValueOnce(scopes);

      const error = new InvalidRequestError('One or more parameters changed since the initial Authorization Request.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CustomAuthorizationRequestValidator] One or more parameters changed since the initial Authorization Request',
        '80670caa-b8b3-4bd9-84bf-0b4a496c4169',
        { grant, client, parameters },
        error,
      );
    });

    it('should return an Authorization Context without the "offline_access" Scope if not requested together with the "consent" Prompt.', async () => {
      const request = requestFactory({ prompt: undefined as any });

      const scopes: string[] = ['foo', 'bar', 'baz', 'offline_access'];

      dataAccessMock.findClient.mockResolvedValueOnce(client);
      dataAccessMock.findSession.mockResolvedValueOnce(null);
      scopeHandlerMock.getAllowedScopes.mockReturnValueOnce(scopes);

      await expect(validator.validate(request)).resolves.toMatchObject<AuthorizationContext>({
        parameters,
        cookies: request.cookies,
        responseType: responseTypeMocks[0]!,
        client,
        redirectUri: client.redirectUris[0]!,
        scopes: ['foo', 'bar', 'baz'],
        state: 'client_state',
        responseMode: responseModeMocks[0]!,
        nonce: 'client_nonce',
        display: displayMocks[1]!,
        prompts: [],
        maxAge: 300,
        uiLocales: ['pt-BR', 'en'],
        idTokenHint: 'id_token_hint',
        loginHint: 'login_hint',
        acrValues: ['urn:guarani:acr:2fa', 'urn:guarani:acr:1fa'],
        session: null,
      });
    });

    it('should return an Authorization Context without the "offline_access" Scope if not requested together with a "code" Response Type.', async () => {
      const request = requestFactory({ response_type: 'token' });
      request.cookies['guarani:session'] = 'session_id';

      const scopes: string[] = ['foo', 'bar', 'baz', 'offline_access'];

      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
      });

      dataAccessMock.findClient.mockResolvedValueOnce(tokenClient);
      dataAccessMock.findSession.mockResolvedValueOnce(session);
      scopeHandlerMock.getAllowedScopes.mockReturnValueOnce(scopes);

      await expect(validator.validate(request)).resolves.toMatchObject<AuthorizationContext>({
        parameters,
        cookies: request.cookies,
        responseType: responseTypeMocks[1]!,
        client: tokenClient,
        redirectUri: tokenClient.redirectUris[0]!,
        scopes: ['foo', 'bar', 'baz'],
        state: 'client_state',
        responseMode: responseModeMocks[0]!,
        nonce: 'client_nonce',
        display: displayMocks[1]!,
        prompts: ['consent'],
        maxAge: 300,
        uiLocales: ['pt-BR', 'en'],
        idTokenHint: 'id_token_hint',
        loginHint: 'login_hint',
        acrValues: ['urn:guarani:acr:2fa', 'urn:guarani:acr:1fa'],
        session,
      });
    });

    it('should return an Authorization Context with default values for parameters not provided.', async () => {
      const request = requestFactory({
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

      request.cookies['guarani:session'] = 'session_id';

      const scopes: string[] = ['foo', 'bar', 'baz'];

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

      dataAccessMock.findClient.mockResolvedValueOnce(client);
      dataAccessMock.findSession.mockResolvedValueOnce(session);
      scopeHandlerMock.getAllowedScopes.mockReturnValueOnce(scopes);

      await expect(validator.validate(request)).resolves.toMatchObject<AuthorizationContext>({
        parameters,
        cookies: request.cookies,
        responseType: responseTypeMocks[0]!,
        client,
        redirectUri: client.redirectUris[0]!,
        scopes,
        state: null,
        responseMode: responseModeMocks[0]!,
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
      const request = requestFactory();
      request.cookies['guarani:session'] = 'session_id';

      const scopes: string[] = ['foo', 'bar', 'baz'];

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

      dataAccessMock.findClient.mockResolvedValueOnce(client);
      dataAccessMock.findSession.mockResolvedValueOnce(session);
      scopeHandlerMock.getAllowedScopes.mockReturnValueOnce(scopes);

      await expect(validator.validate(request)).resolves.toMatchObject<AuthorizationContext>({
        parameters,
        cookies: request.cookies,
        responseType: responseTypeMocks[0]!,
        client,
        redirectUri: client.redirectUris[0]!,
        scopes,
        state: 'client_state',
        responseMode: responseModeMocks[0]!,
        nonce: 'client_nonce',
        display: displayMocks[1]!,
        prompts: ['consent'],
        maxAge: 300,
        uiLocales: ['pt-BR', 'en'],
        idTokenHint: 'id_token_hint',
        loginHint: 'login_hint',
        acrValues: ['urn:guarani:acr:2fa', 'urn:guarani:acr:1fa'],
        session,
      });
    });
  });
});
