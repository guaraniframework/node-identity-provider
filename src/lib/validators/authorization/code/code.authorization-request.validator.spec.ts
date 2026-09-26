import { Buffer } from 'buffer';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CodeAuthorizationContext } from '../../../context/authorization/code/code.authorization-context';
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
import { Pkce } from '../../../pkce/pkce';
import { PkceName } from '../../../pkce/pkce-name.type';
import { CodeAuthorizationRequest } from '../../../requests/authorization/code/code.authorization-request';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { Settings } from '../../../settings/settings';
import { SETTINGS } from '../../../settings/settings.token';
import { addParametersToUrl } from '../../../utils/add-parameters-to-url/add-parameters-to-url';
import { AuthorizationRequestValidator } from '../authorization-request.validator';
import { CodeAuthorizationRequestValidator } from './code.authorization-request.validator';

jest.mock('../../../handlers/scope/scope.handler');
jest.mock('../../../logger/logger');

const invalidCodeChallenges: any[] = [undefined, ''];

describe('Code Authorization Request Validator', () => {
  let validator: CodeAuthorizationRequestValidator;
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

  const pkceMocks = [
    jest.mocked<Pkce>(Object.assign<Pkce, Partial<Pkce>>(Reflect.construct(Pkce, []), { name: 'S256' })),
    jest.mocked<Pkce>(Object.assign<Pkce, Partial<Pkce>>(Reflect.construct(Pkce, []), { name: 'plain' })),
  ];

  const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
    id: 'client_id',
    redirectUris: [new URL('https://client.example.com/oidc/callback')],
    responseTypes: ['code'],
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
    pkceMocks.forEach((pkceMock) => container.bind(Pkce).toValue(pkceMock));
    container.bind(CodeAuthorizationRequestValidator).toSelf().asSingleton();

    validator = container.resolve(CodeAuthorizationRequestValidator);
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('name', () => {
    it('should have "code" as its value.', () => {
      expect(validator.name).toEqual<ResponseTypeName>('code');
    });
  });

  describe('forbiddenResponseModes', () => {
    it('should have an empty list as its value.', () => {
      expect(validator['forbiddenResponseModes']).toStrictEqual<ResponseModeName[]>([]);
    });
  });

  describe('constructor', () => {
    it('should instantiate a new Code Authorization Request Validator.', () => {
      expect(Object.getPrototypeOf(CodeAuthorizationRequestValidator)).toBe(AuthorizationRequestValidator);
      expect(() => container.resolve(CodeAuthorizationRequestValidator)).not.toThrow();
    });
  });

  describe('validate()', () => {
    let parameters: CodeAuthorizationRequest;

    const requestFactory = (data: Partial<CodeAuthorizationRequest> = {}): HttpRequest => {
      removeNullishValues<CodeAuthorizationRequest>(Object.assign(parameters, data));

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
        code_challenge: 'qoJXAtQ-gjzfDmoMrHt1a2AFVe1Tn3-HX0VC2_UtezA',
        code_challenge_method: 'S256',
        scope: 'openid foo bar baz',
        state: 'client_state',
        response_mode: 'form_post',
        nonce: 'client_nonce',
        prompt: 'consent',
        display: 'popup',
        max_age: '300',
        login_hint: 'login_hint',
        id_token_hint: 'id_token_hint',
        ui_locales: 'pt-BR en',
        acr_values: 'urn:guarani:acr:2fa urn:guarani:acr:1fa',
      };
    });

    it.each(invalidCodeChallenges)(
      'should throw when the provided parameter "code_challenge" is invalid.',
      async (codeChallenge) => {
        const request = requestFactory({ code_challenge: codeChallenge });
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

        const superValidateSpy = jest.spyOn(AuthorizationRequestValidator.prototype, 'validate');

        const error = new InvalidRequestError('Invalid parameter "code_challenge".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[CodeAuthorizationRequestValidator] Invalid parameter "code_challenge"',
          'b3f1c7cb-74cc-480a-8d17-431a46d4f945',
          { parameters },
          error,
        );
      },
    );

    it('should throw when the provided parameter "code_challenge_method" is invalid.', async () => {
      const request = requestFactory({ code_challenge_method: '' as PkceName });
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

      const superValidateSpy = jest.spyOn(AuthorizationRequestValidator.prototype, 'validate');

      const error = new InvalidRequestError('Invalid parameter "code_challenge_method".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CodeAuthorizationRequestValidator] Invalid parameter "code_challenge_method"',
        'da4f691c-0b44-4f0e-b8b5-38c85eeb5526',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "response_mode" is unsupported.', async () => {
      const request = requestFactory({ code_challenge_method: 'unknown' as PkceName });
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

      const superValidateSpy = jest.spyOn(AuthorizationRequestValidator.prototype, 'validate');

      const error = new InvalidRequestError('Unsupported code_challenge_method "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CodeAuthorizationRequestValidator] Unsupported code_challenge_method "unknown"',
        '815450a9-3c8c-400e-834c-734e696a838b',
        { parameters },
        error,
      );
    });

    it('should return a Code Authorization Context.', async () => {
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

      await expect(validator.validate(request)).resolves.toMatchObject<CodeAuthorizationContext>({
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
        codeChallenge: 'qoJXAtQ-gjzfDmoMrHt1a2AFVe1Tn3-HX0VC2_UtezA',
        codeChallengeMethod: pkceMocks[0]!,
      });
    });

    it('should return a Code Authorization Context with the default PKCE.', async () => {
      const request = requestFactory({ code_challenge_method: undefined as any });
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

      await expect(validator.validate(request)).resolves.toMatchObject<CodeAuthorizationContext>({
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
        codeChallenge: 'qoJXAtQ-gjzfDmoMrHt1a2AFVe1Tn3-HX0VC2_UtezA',
        codeChallengeMethod: pkceMocks[0]!,
      });
    });
  });
});
