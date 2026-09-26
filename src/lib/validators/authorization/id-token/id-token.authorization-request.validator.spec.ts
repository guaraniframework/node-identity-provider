import { Buffer } from 'buffer';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { IdTokenAuthorizationContext } from '../../../context/authorization/id-token/id-token.authorization-context';
import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { Client } from '../../../entities/client';
import { Grant } from '../../../entities/grant';
import { Session } from '../../../entities/session';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { Logger } from '../../../logger/logger';
import { CONTAINER } from '../../../metadata/container.token';
import { IdTokenAuthorizationRequest } from '../../../requests/authorization/id-token/id-token.authorization-request';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { Settings } from '../../../settings/settings';
import { SETTINGS } from '../../../settings/settings.token';
import { addParametersToUrl } from '../../../utils/add-parameters-to-url/add-parameters-to-url';
import { AuthorizationRequestValidator } from '../authorization-request.validator';
import { IdTokenAuthorizationRequestValidator } from './id-token.authorization-request.validator';

jest.mock('../../../handlers/scope/scope.handler');
jest.mock('../../../logger/logger');

const invalidNonces: any[] = [undefined, ''];

describe('ID Token Authorization Request Validator', () => {
  let validator: IdTokenAuthorizationRequestValidator;
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
        name: 'id_token',
      }),
    ),
  ];

  const responseModeMocks = [
    jest.mocked<ResponseMode>(
      Object.assign<ResponseMode, Partial<ResponseMode>>(Reflect.construct(ResponseMode, []), { name: 'form_post' }),
    ),
  ];

  const displayMocks = [
    jest.mocked<Display>(Object.assign<Display, Partial<Display>>(Reflect.construct(Display, []), { name: 'popup' })),
  ];

  const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
    id: 'client_id',
    redirectUris: [new URL('https://client.example.com/oidc/callback')],
    responseTypes: ['id_token'],
    scopes: ['openid', 'foo', 'bar', 'baz', 'qux'],
  });

  const scopes: string[] = ['openid', 'foo', 'bar', 'baz'];

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(ScopeHandler).toValue(scopeHandlerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind<Partial<Settings>>(SETTINGS).toValue(settings);
    responseTypeMocks.forEach((responseTypeMock) => container.bind(ResponseType).toValue(responseTypeMock));
    responseModeMocks.forEach((responseModeMock) => container.bind(ResponseMode).toValue(responseModeMock));
    displayMocks.forEach((displayMock) => container.bind(Display).toValue(displayMock));
    container.bind(IdTokenAuthorizationRequestValidator).toSelf().asSingleton();

    validator = container.resolve(IdTokenAuthorizationRequestValidator);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "id_token" as its value.', () => {
      expect(validator.name).toEqual<ResponseTypeName>('id_token');
    });
  });

  describe('forbiddenResponseModes', () => {
    it('should have ["query"] as its value.', () => {
      expect(validator['forbiddenResponseModes']).toStrictEqual<ResponseModeName[]>(['query']);
    });
  });

  describe('constructor', () => {
    it('should instantiate a new ID Token Authorization Request Validator.', () => {
      expect(Object.getPrototypeOf(IdTokenAuthorizationRequestValidator)).toBe(AuthorizationRequestValidator);
      expect(() => container.resolve(IdTokenAuthorizationRequestValidator)).not.toThrow();
    });
  });

  describe('validate()', () => {
    let parameters!: IdTokenAuthorizationRequest;

    const requestFactory = (data: Partial<IdTokenAuthorizationRequest> = {}): HttpRequest => {
      removeNullishValues<IdTokenAuthorizationRequest>(Object.assign(parameters, data));

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
        response_type: 'id_token',
        client_id: 'client_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
        scope: 'openid foo bar baz',
        state: 'client_state',
        response_mode: 'form_post',
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

    it.each(invalidNonces)('should throw when the provided parameter "nonce" is invalid.', async (nonce) => {
      const request = requestFactory({ nonce });

      dataAccessMock.findClient.mockResolvedValueOnce(client);

      const error = new InvalidRequestError('Invalid parameter "nonce".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[IdTokenAuthorizationRequestValidator] Invalid parameter "nonce"',
        'b47df73e-909f-451d-a6f0-7a2113abe24d',
        { parameters },
        error,
      );
    });

    it('should return an ID Token Authorization Context.', async () => {
      const request = requestFactory();
      request.cookies['guarani:session'] = 'session_id';

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

      await expect(validator.validate(request)).resolves.toMatchObject<IdTokenAuthorizationContext>({
        parameters,
        cookies: request.cookies,
        responseType: responseTypeMocks[0]!,
        client,
        redirectUri: client.redirectUris[0]!,
        scopes,
        state: 'client_state',
        responseMode: responseModeMocks[0]!,
        nonce: 'client_nonce',
        display: displayMocks[0]!,
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
