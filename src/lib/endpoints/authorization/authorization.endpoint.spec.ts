import { Buffer } from 'buffer';
import { OutgoingHttpHeaders } from 'http';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CONTAINER, DEFAULT_SESSION_COOKIE } from '../../constants';
import { AuthorizationContext } from '../../context/authorization/authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { Display } from '../../displays/display';
import { Client } from '../../entities/client';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Session } from '../../entities/session';
import { ConsentRequiredError } from '../../errors/consent-required/consent-required.error';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { LoginRequiredError } from '../../errors/login-required/login-required.error';
import { ServerErrorError } from '../../errors/server-error/server-error.error';
import { UnsupportedResponseTypeError } from '../../errors/unsupported-response-type/unsupported-response-type.error';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { HttpResponse } from '../../http/response/http-response';
import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { HttpRoute } from '../../http/route/http-route';
import { InteractionTypeName } from '../../interaction-types/interaction-type-name.type';
import { Logger } from '../../loggers/logger';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { ResponseMode } from '../../response-modes/response-mode';
import { ResponseType } from '../../response-types/response-type';
import { ResponseTypeName } from '../../response-types/response-type-name.type';
import { AuthorizationResponse } from '../../responses/authorization/authorization-response';
import { InteractionsSettings } from '../../settings/interactions/interactions.settings';
import { Settings } from '../../settings/settings';
import { Prompt } from '../../types/promt.type';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { AuthorizationValidator } from '../../validators/authorization/authorization.validator';
import { EndpointName } from '../endpoint-name.type';
import { AuthorizationEndpoint } from './authorization.endpoint';

jest.mock('../../handlers/id-token/id-token.handler');
jest.mock('../../loggers/logger');

const authenticationInteractions: InteractionTypeName[] = ['create', 'login', 'select_account'];

describe('Authorization Endpoint', () => {
  let endpoint: AuthorizationEndpoint;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      createGrant: jest.fn(),
      createSession: jest.fn(),
      findConsentByClientAndUser: jest.fn(),
      inactivateSessionActiveLogin: jest.fn(),
      logout: jest.fn(),
      removeConsent: jest.fn(),
      removeGrant: jest.fn(),
    }),
  );

  const settingsMock = jest.mocked<Settings>(
    Object.assign<Settings, Partial<Settings>>(Object.create(Settings.prototype), {
      issuer: new URL('https://provider.example.com'),
      idTokenSignatureAlgorithms: ['ES256'],
      interactions: new InteractionsSettings({
        errorUrl: 'https://provider.example.com/oidc/error',
        registrationUrl: 'https://provider.example.com/oidc/registration',
        accountSelectionUrl: 'https://provider.example.com/oidc/account-selection',
        loginUrl: 'https://provider.example.com/oidc/login',
        consentUrl: 'https://provider.example.com/oidc/consent',
      }),
      minimumMaxAge: 300,
      sessionCookie: DEFAULT_SESSION_COOKIE,
    }),
  );

  const validatorMock = jest.mocked<AuthorizationValidator>(
    Object.assign<AuthorizationValidator, Partial<AuthorizationValidator>>(
      Reflect.construct(AuthorizationValidator, []),
      { name: 'code', validate: jest.fn() },
    ),
  );

  const idTokenHandlerMock = jest.mocked(IdTokenHandler.prototype);

  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(2026, 7, 12, 0, 0, 0, 0) });
  });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(Settings).toValue(settingsMock);
    container.bind(AuthorizationValidator).toValue(validatorMock);
    container.bind(IdTokenHandler).toValue(idTokenHandlerMock);
    container.bind(AuthorizationEndpoint).toSelf().asSingleton();

    endpoint = container.resolve(AuthorizationEndpoint);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('name', () => {
    it('should have "authorization" as its value.', () => {
      expect(endpoint.name).toBe<EndpointName>('authorization');
    });
  });

  describe('path', () => {
    it('should have "/oidc/authorization" as its value.', () => {
      expect(endpoint.path).toBe('/oidc/authorization');
    });
  });

  describe('routes', () => {
    it('should have a GET and a POST route as its value.', () => {
      expect(endpoint.routes).toStrictEqual<HttpRoute[]>([
        { method: HttpRequestMethod.GET, handler: endpoint.handle },
        { method: HttpRequestMethod.POST, handler: endpoint.handle },
      ]);
    });
  });

  describe('handle()', () => {
    let parameters: AuthorizationRequest;

    let expiredLogin: Login;
    let oldLogin: Login;
    let expiredConsent: Consent;

    const requestFactory = (data: Partial<AuthorizationRequest> = {}): HttpRequest => {
      removeNullishValues<AuthorizationRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: HttpRequestMethod.GET,
        url: addParametersToUrl('https://provider.example.com/oidc/authorization', parameters),
      });
    };

    const displayMock = jest.mocked<Display>(
      Object.assign<Display, Partial<Display>>(Reflect.construct(Display, []), { createHttpResponse: jest.fn() }),
    );

    const responseModeMock = jest.mocked<ResponseMode>(
      Object.assign<ResponseMode, Partial<ResponseMode>>(Reflect.construct(ResponseMode, []), {
        createHttpResponse: jest.fn(),
      }),
    );

    const responseTypeMock = jest.mocked<ResponseType>(
      Object.assign<ResponseType, Partial<ResponseType>>(Reflect.construct(ResponseType, []), {
        handle: jest.fn(),
      }),
    );

    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { id: 'client_id' });

    const login: Login = Object.assign<Login, Partial<Login>>(new Login(), {
      id: 'login_id',
      createdAt: new Date(),
      expiresAt: null,
    });

    const consent: Consent = Object.assign<Consent, Partial<Consent>>(new Consent(), {
      id: 'consent_id',
      expiresAt: null,
    });

    const nonExpiredLogin: Login = Object.assign<Login, Partial<Login>>(new Login(), {
      id: 'login_id',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    });

    const nonExpiredConsent: Consent = Object.assign<Consent, Partial<Consent>>(new Consent(), {
      id: 'login_id',
      expiresAt: new Date(Date.now() + 3600000),
    });

    const happyPathsConditions: [Prompt[], InteractionTypeName[], Login, number | null, string | null, Consent][] = [
      [[], [], login, null, null, consent],
      [[], [], login, null, null, nonExpiredConsent],
      [[], [], login, null, 'id_token', consent],
      [[], [], login, null, 'id_token', nonExpiredConsent],
      [[], [], login, 300, null, consent],
      [[], [], login, 300, null, nonExpiredConsent],
      [[], [], login, 300, 'id_token', consent],
      [[], [], login, 300, 'id_token', nonExpiredConsent],
      [[], [], nonExpiredLogin, null, null, consent],
      [[], [], nonExpiredLogin, null, null, nonExpiredConsent],
      [[], [], nonExpiredLogin, null, 'id_token', consent],
      [[], [], nonExpiredLogin, null, 'id_token', nonExpiredConsent],
      [[], [], nonExpiredLogin, 300, null, consent],
      [[], [], nonExpiredLogin, 300, null, nonExpiredConsent],
      [[], [], nonExpiredLogin, 300, 'id_token', consent],
      [[], [], nonExpiredLogin, 300, 'id_token', nonExpiredConsent],
      [[], ['login'], login, null, null, consent],
      [[], ['login'], login, null, null, nonExpiredConsent],
      [[], ['login'], login, null, 'id_token', consent],
      [[], ['login'], login, null, 'id_token', nonExpiredConsent],
      [[], ['login'], login, 0, null, consent],
      [[], ['login'], login, 0, null, nonExpiredConsent],
      [[], ['login'], login, 0, 'id_token', consent],
      [[], ['login'], login, 0, 'id_token', nonExpiredConsent],
      [[], ['login'], login, 300, null, consent],
      [[], ['login'], login, 300, null, nonExpiredConsent],
      [[], ['login'], login, 300, 'id_token', consent],
      [[], ['login'], login, 300, 'id_token', nonExpiredConsent],
      [[], ['login'], nonExpiredLogin, null, null, consent],
      [[], ['login'], nonExpiredLogin, null, null, nonExpiredConsent],
      [[], ['login'], nonExpiredLogin, null, 'id_token', consent],
      [[], ['login'], nonExpiredLogin, null, 'id_token', nonExpiredConsent],
      [[], ['login'], nonExpiredLogin, 0, null, consent],
      [[], ['login'], nonExpiredLogin, 0, null, nonExpiredConsent],
      [[], ['login'], nonExpiredLogin, 0, 'id_token', consent],
      [[], ['login'], nonExpiredLogin, 0, 'id_token', nonExpiredConsent],
      [[], ['login'], nonExpiredLogin, 300, null, consent],
      [[], ['login'], nonExpiredLogin, 300, null, nonExpiredConsent],
      [[], ['login'], nonExpiredLogin, 300, 'id_token', consent],
      [[], ['login'], nonExpiredLogin, 300, 'id_token', nonExpiredConsent],
      [[], ['login', 'consent'], login, null, null, consent],
      [[], ['login', 'consent'], login, null, null, nonExpiredConsent],
      [[], ['login', 'consent'], login, null, 'id_token', consent],
      [[], ['login', 'consent'], login, null, 'id_token', nonExpiredConsent],
      [[], ['login', 'consent'], login, 0, null, consent],
      [[], ['login', 'consent'], login, 0, null, nonExpiredConsent],
      [[], ['login', 'consent'], login, 0, 'id_token', consent],
      [[], ['login', 'consent'], login, 0, 'id_token', nonExpiredConsent],
      [[], ['login', 'consent'], login, 300, null, consent],
      [[], ['login', 'consent'], login, 300, null, nonExpiredConsent],
      [[], ['login', 'consent'], login, 300, 'id_token', consent],
      [[], ['login', 'consent'], login, 300, 'id_token', nonExpiredConsent],
      [[], ['login', 'consent'], nonExpiredLogin, null, null, consent],
      [[], ['login', 'consent'], nonExpiredLogin, null, null, nonExpiredConsent],
      [[], ['login', 'consent'], nonExpiredLogin, null, 'id_token', consent],
      [[], ['login', 'consent'], nonExpiredLogin, null, 'id_token', nonExpiredConsent],
      [[], ['login', 'consent'], nonExpiredLogin, 0, null, consent],
      [[], ['login', 'consent'], nonExpiredLogin, 0, null, nonExpiredConsent],
      [[], ['login', 'consent'], nonExpiredLogin, 0, 'id_token', consent],
      [[], ['login', 'consent'], nonExpiredLogin, 0, 'id_token', nonExpiredConsent],
      [[], ['login', 'consent'], nonExpiredLogin, 300, null, consent],
      [[], ['login', 'consent'], nonExpiredLogin, 300, null, nonExpiredConsent],
      [[], ['login', 'consent'], nonExpiredLogin, 300, 'id_token', consent],
      [[], ['login', 'consent'], nonExpiredLogin, 300, 'id_token', nonExpiredConsent],
      [[], ['consent'], login, null, null, consent],
      [[], ['consent'], login, null, null, nonExpiredConsent],
      [[], ['consent'], login, null, 'id_token', consent],
      [[], ['consent'], login, null, 'id_token', nonExpiredConsent],
      [[], ['consent'], login, 300, null, consent],
      [[], ['consent'], login, 300, null, nonExpiredConsent],
      [[], ['consent'], login, 300, 'id_token', consent],
      [[], ['consent'], login, 300, 'id_token', nonExpiredConsent],
      [[], ['consent'], nonExpiredLogin, null, null, consent],
      [[], ['consent'], nonExpiredLogin, null, null, nonExpiredConsent],
      [[], ['consent'], nonExpiredLogin, null, 'id_token', consent],
      [[], ['consent'], nonExpiredLogin, null, 'id_token', nonExpiredConsent],
      [[], ['consent'], nonExpiredLogin, 300, null, consent],
      [[], ['consent'], nonExpiredLogin, 300, null, nonExpiredConsent],
      [[], ['consent'], nonExpiredLogin, 300, 'id_token', consent],
      [[], ['consent'], nonExpiredLogin, 300, 'id_token', nonExpiredConsent],
      [['none'], [], login, null, null, consent],
      [['none'], [], login, null, null, nonExpiredConsent],
      [['none'], [], login, null, 'id_token', consent],
      [['none'], [], login, null, 'id_token', nonExpiredConsent],
      [['none'], [], login, 300, null, consent],
      [['none'], [], login, 300, null, nonExpiredConsent],
      [['none'], [], login, 300, 'id_token', consent],
      [['none'], [], login, 300, 'id_token', nonExpiredConsent],
      [['none'], [], nonExpiredLogin, null, null, consent],
      [['none'], [], nonExpiredLogin, null, null, nonExpiredConsent],
      [['none'], [], nonExpiredLogin, null, 'id_token', consent],
      [['none'], [], nonExpiredLogin, null, 'id_token', nonExpiredConsent],
      [['none'], [], nonExpiredLogin, 300, null, consent],
      [['none'], [], nonExpiredLogin, 300, null, nonExpiredConsent],
      [['none'], [], nonExpiredLogin, 300, 'id_token', consent],
      [['none'], [], nonExpiredLogin, 300, 'id_token', nonExpiredConsent],
      [['create'], ['create'], login, null, null, consent],
      [['create'], ['create'], login, null, null, nonExpiredConsent],
      [['create'], ['create'], login, null, 'id_token', consent],
      [['create'], ['create'], login, null, 'id_token', nonExpiredConsent],
      [['create'], ['create'], login, 0, null, consent],
      [['create'], ['create'], login, 0, null, nonExpiredConsent],
      [['create'], ['create'], login, 0, 'id_token', consent],
      [['create'], ['create'], login, 0, 'id_token', nonExpiredConsent],
      [['create'], ['create'], login, 300, null, consent],
      [['create'], ['create'], login, 300, null, nonExpiredConsent],
      [['create'], ['create'], login, 300, 'id_token', consent],
      [['create'], ['create'], login, 300, 'id_token', nonExpiredConsent],
      [['create'], ['create'], nonExpiredLogin, null, null, consent],
      [['create'], ['create'], nonExpiredLogin, null, null, nonExpiredConsent],
      [['create'], ['create'], nonExpiredLogin, null, 'id_token', consent],
      [['create'], ['create'], nonExpiredLogin, null, 'id_token', nonExpiredConsent],
      [['create'], ['create'], nonExpiredLogin, 0, null, consent],
      [['create'], ['create'], nonExpiredLogin, 0, null, nonExpiredConsent],
      [['create'], ['create'], nonExpiredLogin, 0, 'id_token', consent],
      [['create'], ['create'], nonExpiredLogin, 0, 'id_token', nonExpiredConsent],
      [['create'], ['create'], nonExpiredLogin, 300, null, consent],
      [['create'], ['create'], nonExpiredLogin, 300, null, nonExpiredConsent],
      [['create'], ['create'], nonExpiredLogin, 300, 'id_token', consent],
      [['create'], ['create'], nonExpiredLogin, 300, 'id_token', nonExpiredConsent],
      [['create'], ['create', 'consent'], login, null, null, consent],
      [['create'], ['create', 'consent'], login, null, null, nonExpiredConsent],
      [['create'], ['create', 'consent'], login, null, 'id_token', consent],
      [['create'], ['create', 'consent'], login, null, 'id_token', nonExpiredConsent],
      [['create'], ['create', 'consent'], login, 0, null, consent],
      [['create'], ['create', 'consent'], login, 0, null, nonExpiredConsent],
      [['create'], ['create', 'consent'], login, 0, 'id_token', consent],
      [['create'], ['create', 'consent'], login, 0, 'id_token', nonExpiredConsent],
      [['create'], ['create', 'consent'], login, 300, null, consent],
      [['create'], ['create', 'consent'], login, 300, null, nonExpiredConsent],
      [['create'], ['create', 'consent'], login, 300, 'id_token', consent],
      [['create'], ['create', 'consent'], login, 300, 'id_token', nonExpiredConsent],
      [['create'], ['create', 'consent'], nonExpiredLogin, null, null, consent],
      [['create'], ['create', 'consent'], nonExpiredLogin, null, null, nonExpiredConsent],
      [['create'], ['create', 'consent'], nonExpiredLogin, null, 'id_token', consent],
      [['create'], ['create', 'consent'], nonExpiredLogin, null, 'id_token', nonExpiredConsent],
      [['create'], ['create', 'consent'], nonExpiredLogin, 0, null, consent],
      [['create'], ['create', 'consent'], nonExpiredLogin, 0, null, nonExpiredConsent],
      [['create'], ['create', 'consent'], nonExpiredLogin, 0, 'id_token', consent],
      [['create'], ['create', 'consent'], nonExpiredLogin, 0, 'id_token', nonExpiredConsent],
      [['create'], ['create', 'consent'], nonExpiredLogin, 300, null, consent],
      [['create'], ['create', 'consent'], nonExpiredLogin, 300, null, nonExpiredConsent],
      [['create'], ['create', 'consent'], nonExpiredLogin, 300, 'id_token', consent],
      [['create'], ['create', 'consent'], nonExpiredLogin, 300, 'id_token', nonExpiredConsent],
      [['create', 'consent'], ['create', 'consent'], login, null, null, consent],
      [['create', 'consent'], ['create', 'consent'], login, null, null, nonExpiredConsent],
      [['create', 'consent'], ['create', 'consent'], login, null, 'id_token', consent],
      [['create', 'consent'], ['create', 'consent'], login, null, 'id_token', nonExpiredConsent],
      [['create', 'consent'], ['create', 'consent'], login, 0, null, consent],
      [['create', 'consent'], ['create', 'consent'], login, 0, null, nonExpiredConsent],
      [['create', 'consent'], ['create', 'consent'], login, 0, 'id_token', consent],
      [['create', 'consent'], ['create', 'consent'], login, 0, 'id_token', nonExpiredConsent],
      [['create', 'consent'], ['create', 'consent'], login, 300, null, consent],
      [['create', 'consent'], ['create', 'consent'], login, 300, null, nonExpiredConsent],
      [['create', 'consent'], ['create', 'consent'], login, 300, 'id_token', consent],
      [['create', 'consent'], ['create', 'consent'], login, 300, 'id_token', nonExpiredConsent],
      [['create', 'consent'], ['create', 'consent'], nonExpiredLogin, null, null, consent],
      [['create', 'consent'], ['create', 'consent'], nonExpiredLogin, null, null, nonExpiredConsent],
      [['create', 'consent'], ['create', 'consent'], nonExpiredLogin, null, 'id_token', consent],
      [['create', 'consent'], ['create', 'consent'], nonExpiredLogin, null, 'id_token', nonExpiredConsent],
      [['create', 'consent'], ['create', 'consent'], nonExpiredLogin, 0, null, consent],
      [['create', 'consent'], ['create', 'consent'], nonExpiredLogin, 0, null, nonExpiredConsent],
      [['create', 'consent'], ['create', 'consent'], nonExpiredLogin, 0, 'id_token', consent],
      [['create', 'consent'], ['create', 'consent'], nonExpiredLogin, 0, 'id_token', nonExpiredConsent],
      [['create', 'consent'], ['create', 'consent'], nonExpiredLogin, 300, null, consent],
      [['create', 'consent'], ['create', 'consent'], nonExpiredLogin, 300, null, nonExpiredConsent],
      [['create', 'consent'], ['create', 'consent'], nonExpiredLogin, 300, 'id_token', consent],
      [['create', 'consent'], ['create', 'consent'], nonExpiredLogin, 300, 'id_token', nonExpiredConsent],
      [['select_account'], ['select_account'], login, null, null, consent],
      [['select_account'], ['select_account'], login, null, null, nonExpiredConsent],
      [['select_account'], ['select_account'], login, null, 'id_token', consent],
      [['select_account'], ['select_account'], login, null, 'id_token', nonExpiredConsent],
      [['select_account'], ['select_account'], login, 0, null, consent],
      [['select_account'], ['select_account'], login, 0, null, nonExpiredConsent],
      [['select_account'], ['select_account'], login, 0, 'id_token', consent],
      [['select_account'], ['select_account'], login, 0, 'id_token', nonExpiredConsent],
      [['select_account'], ['select_account'], login, 300, null, consent],
      [['select_account'], ['select_account'], login, 300, null, nonExpiredConsent],
      [['select_account'], ['select_account'], login, 300, 'id_token', consent],
      [['select_account'], ['select_account'], login, 300, 'id_token', nonExpiredConsent],
      [['select_account'], ['select_account'], nonExpiredLogin, null, null, consent],
      [['select_account'], ['select_account'], nonExpiredLogin, null, null, nonExpiredConsent],
      [['select_account'], ['select_account'], nonExpiredLogin, null, 'id_token', consent],
      [['select_account'], ['select_account'], nonExpiredLogin, null, 'id_token', nonExpiredConsent],
      [['select_account'], ['select_account'], nonExpiredLogin, 0, null, consent],
      [['select_account'], ['select_account'], nonExpiredLogin, 0, null, nonExpiredConsent],
      [['select_account'], ['select_account'], nonExpiredLogin, 0, 'id_token', consent],
      [['select_account'], ['select_account'], nonExpiredLogin, 0, 'id_token', nonExpiredConsent],
      [['select_account'], ['select_account'], nonExpiredLogin, 300, null, consent],
      [['select_account'], ['select_account'], nonExpiredLogin, 300, null, nonExpiredConsent],
      [['select_account'], ['select_account'], nonExpiredLogin, 300, 'id_token', consent],
      [['select_account'], ['select_account'], nonExpiredLogin, 300, 'id_token', nonExpiredConsent],
      [['select_account'], ['select_account', 'consent'], login, null, null, consent],
      [['select_account'], ['select_account', 'consent'], login, null, null, nonExpiredConsent],
      [['select_account'], ['select_account', 'consent'], login, null, 'id_token', consent],
      [['select_account'], ['select_account', 'consent'], login, null, 'id_token', nonExpiredConsent],
      [['select_account'], ['select_account', 'consent'], login, 0, null, consent],
      [['select_account'], ['select_account', 'consent'], login, 0, null, nonExpiredConsent],
      [['select_account'], ['select_account', 'consent'], login, 0, 'id_token', consent],
      [['select_account'], ['select_account', 'consent'], login, 0, 'id_token', nonExpiredConsent],
      [['select_account'], ['select_account', 'consent'], login, 300, null, consent],
      [['select_account'], ['select_account', 'consent'], login, 300, null, nonExpiredConsent],
      [['select_account'], ['select_account', 'consent'], login, 300, 'id_token', consent],
      [['select_account'], ['select_account', 'consent'], login, 300, 'id_token', nonExpiredConsent],
      [['select_account'], ['select_account', 'consent'], nonExpiredLogin, null, null, consent],
      [['select_account'], ['select_account', 'consent'], nonExpiredLogin, null, null, nonExpiredConsent],
      [['select_account'], ['select_account', 'consent'], nonExpiredLogin, null, 'id_token', consent],
      [['select_account'], ['select_account', 'consent'], nonExpiredLogin, null, 'id_token', nonExpiredConsent],
      [['select_account'], ['select_account', 'consent'], nonExpiredLogin, 0, null, consent],
      [['select_account'], ['select_account', 'consent'], nonExpiredLogin, 0, null, nonExpiredConsent],
      [['select_account'], ['select_account', 'consent'], nonExpiredLogin, 0, 'id_token', consent],
      [['select_account'], ['select_account', 'consent'], nonExpiredLogin, 0, 'id_token', nonExpiredConsent],
      [['select_account'], ['select_account', 'consent'], nonExpiredLogin, 300, null, consent],
      [['select_account'], ['select_account', 'consent'], nonExpiredLogin, 300, null, nonExpiredConsent],
      [['select_account'], ['select_account', 'consent'], nonExpiredLogin, 300, 'id_token', consent],
      [['select_account'], ['select_account', 'consent'], nonExpiredLogin, 300, 'id_token', nonExpiredConsent],
      [['select_account', 'consent'], ['select_account', 'consent'], login, null, null, consent],
      [['select_account', 'consent'], ['select_account', 'consent'], login, null, null, nonExpiredConsent],
      [['select_account', 'consent'], ['select_account', 'consent'], login, null, 'id_token', consent],
      [['select_account', 'consent'], ['select_account', 'consent'], login, null, 'id_token', nonExpiredConsent],
      [['select_account', 'consent'], ['select_account', 'consent'], login, 0, null, consent],
      [['select_account', 'consent'], ['select_account', 'consent'], login, 0, null, nonExpiredConsent],
      [['select_account', 'consent'], ['select_account', 'consent'], login, 0, 'id_token', consent],
      [['select_account', 'consent'], ['select_account', 'consent'], login, 0, 'id_token', nonExpiredConsent],
      [['select_account', 'consent'], ['select_account', 'consent'], login, 300, null, consent],
      [['select_account', 'consent'], ['select_account', 'consent'], login, 300, null, nonExpiredConsent],
      [['select_account', 'consent'], ['select_account', 'consent'], login, 300, 'id_token', consent],
      [['select_account', 'consent'], ['select_account', 'consent'], login, 300, 'id_token', nonExpiredConsent],
      [['select_account', 'consent'], ['select_account', 'consent'], nonExpiredLogin, null, null, consent],
      [['select_account', 'consent'], ['select_account', 'consent'], nonExpiredLogin, null, null, nonExpiredConsent],
      [['select_account', 'consent'], ['select_account', 'consent'], nonExpiredLogin, null, 'id_token', consent],
      [
        ['select_account', 'consent'],
        ['select_account', 'consent'],
        nonExpiredLogin,
        null,
        'id_token',
        nonExpiredConsent,
      ],
      [['select_account', 'consent'], ['select_account', 'consent'], nonExpiredLogin, 0, null, consent],
      [['select_account', 'consent'], ['select_account', 'consent'], nonExpiredLogin, 0, null, nonExpiredConsent],
      [['select_account', 'consent'], ['select_account', 'consent'], nonExpiredLogin, 0, 'id_token', consent],
      [['select_account', 'consent'], ['select_account', 'consent'], nonExpiredLogin, 0, 'id_token', nonExpiredConsent],
      [['select_account', 'consent'], ['select_account', 'consent'], nonExpiredLogin, 300, null, consent],
      [['select_account', 'consent'], ['select_account', 'consent'], nonExpiredLogin, 300, null, nonExpiredConsent],
      [['select_account', 'consent'], ['select_account', 'consent'], nonExpiredLogin, 300, 'id_token', consent],
      [
        ['select_account', 'consent'],
        ['select_account', 'consent'],
        nonExpiredLogin,
        300,
        'id_token',
        nonExpiredConsent,
      ],
      [['login'], ['login'], login, null, null, consent],
      [['login'], ['login'], login, null, null, nonExpiredConsent],
      [['login'], ['login'], login, null, 'id_token', consent],
      [['login'], ['login'], login, null, 'id_token', nonExpiredConsent],
      [['login'], ['login'], login, 0, null, consent],
      [['login'], ['login'], login, 0, null, nonExpiredConsent],
      [['login'], ['login'], login, 0, 'id_token', consent],
      [['login'], ['login'], login, 0, 'id_token', nonExpiredConsent],
      [['login'], ['login'], login, 300, null, consent],
      [['login'], ['login'], login, 300, null, nonExpiredConsent],
      [['login'], ['login'], login, 300, 'id_token', consent],
      [['login'], ['login'], login, 300, 'id_token', nonExpiredConsent],
      [['login'], ['login'], nonExpiredLogin, null, null, consent],
      [['login'], ['login'], nonExpiredLogin, null, null, nonExpiredConsent],
      [['login'], ['login'], nonExpiredLogin, null, 'id_token', consent],
      [['login'], ['login'], nonExpiredLogin, null, 'id_token', nonExpiredConsent],
      [['login'], ['login'], nonExpiredLogin, 0, null, consent],
      [['login'], ['login'], nonExpiredLogin, 0, null, nonExpiredConsent],
      [['login'], ['login'], nonExpiredLogin, 0, 'id_token', consent],
      [['login'], ['login'], nonExpiredLogin, 0, 'id_token', nonExpiredConsent],
      [['login'], ['login'], nonExpiredLogin, 300, null, consent],
      [['login'], ['login'], nonExpiredLogin, 300, null, nonExpiredConsent],
      [['login'], ['login'], nonExpiredLogin, 300, 'id_token', consent],
      [['login'], ['login'], nonExpiredLogin, 300, 'id_token', nonExpiredConsent],
      [['login'], ['login', 'consent'], login, null, null, consent],
      [['login'], ['login', 'consent'], login, null, null, nonExpiredConsent],
      [['login'], ['login', 'consent'], login, null, 'id_token', consent],
      [['login'], ['login', 'consent'], login, null, 'id_token', nonExpiredConsent],
      [['login'], ['login', 'consent'], login, 0, null, consent],
      [['login'], ['login', 'consent'], login, 0, null, nonExpiredConsent],
      [['login'], ['login', 'consent'], login, 0, 'id_token', consent],
      [['login'], ['login', 'consent'], login, 0, 'id_token', nonExpiredConsent],
      [['login'], ['login', 'consent'], login, 300, null, consent],
      [['login'], ['login', 'consent'], login, 300, null, nonExpiredConsent],
      [['login'], ['login', 'consent'], login, 300, 'id_token', consent],
      [['login'], ['login', 'consent'], login, 300, 'id_token', nonExpiredConsent],
      [['login'], ['login', 'consent'], nonExpiredLogin, null, null, consent],
      [['login'], ['login', 'consent'], nonExpiredLogin, null, null, nonExpiredConsent],
      [['login'], ['login', 'consent'], nonExpiredLogin, null, 'id_token', consent],
      [['login'], ['login', 'consent'], nonExpiredLogin, null, 'id_token', nonExpiredConsent],
      [['login'], ['login', 'consent'], nonExpiredLogin, 0, null, consent],
      [['login'], ['login', 'consent'], nonExpiredLogin, 0, null, nonExpiredConsent],
      [['login'], ['login', 'consent'], nonExpiredLogin, 0, 'id_token', consent],
      [['login'], ['login', 'consent'], nonExpiredLogin, 0, 'id_token', nonExpiredConsent],
      [['login'], ['login', 'consent'], nonExpiredLogin, 300, null, consent],
      [['login'], ['login', 'consent'], nonExpiredLogin, 300, null, nonExpiredConsent],
      [['login'], ['login', 'consent'], nonExpiredLogin, 300, 'id_token', consent],
      [['login'], ['login', 'consent'], nonExpiredLogin, 300, 'id_token', nonExpiredConsent],
      [['login', 'consent'], ['login', 'consent'], login, null, null, consent],
      [['login', 'consent'], ['login', 'consent'], login, null, null, nonExpiredConsent],
      [['login', 'consent'], ['login', 'consent'], login, null, 'id_token', consent],
      [['login', 'consent'], ['login', 'consent'], login, null, 'id_token', nonExpiredConsent],
      [['login', 'consent'], ['login', 'consent'], login, 0, null, consent],
      [['login', 'consent'], ['login', 'consent'], login, 0, null, nonExpiredConsent],
      [['login', 'consent'], ['login', 'consent'], login, 0, 'id_token', consent],
      [['login', 'consent'], ['login', 'consent'], login, 0, 'id_token', nonExpiredConsent],
      [['login', 'consent'], ['login', 'consent'], login, 300, null, consent],
      [['login', 'consent'], ['login', 'consent'], login, 300, null, nonExpiredConsent],
      [['login', 'consent'], ['login', 'consent'], login, 300, 'id_token', consent],
      [['login', 'consent'], ['login', 'consent'], login, 300, 'id_token', nonExpiredConsent],
      [['login', 'consent'], ['login', 'consent'], nonExpiredLogin, null, null, consent],
      [['login', 'consent'], ['login', 'consent'], nonExpiredLogin, null, null, nonExpiredConsent],
      [['login', 'consent'], ['login', 'consent'], nonExpiredLogin, null, 'id_token', consent],
      [['login', 'consent'], ['login', 'consent'], nonExpiredLogin, null, 'id_token', nonExpiredConsent],
      [['login', 'consent'], ['login', 'consent'], nonExpiredLogin, 0, null, consent],
      [['login', 'consent'], ['login', 'consent'], nonExpiredLogin, 0, null, nonExpiredConsent],
      [['login', 'consent'], ['login', 'consent'], nonExpiredLogin, 0, 'id_token', consent],
      [['login', 'consent'], ['login', 'consent'], nonExpiredLogin, 0, 'id_token', nonExpiredConsent],
      [['login', 'consent'], ['login', 'consent'], nonExpiredLogin, 300, null, consent],
      [['login', 'consent'], ['login', 'consent'], nonExpiredLogin, 300, null, nonExpiredConsent],
      [['login', 'consent'], ['login', 'consent'], nonExpiredLogin, 300, 'id_token', consent],
      [['login', 'consent'], ['login', 'consent'], nonExpiredLogin, 300, 'id_token', nonExpiredConsent],
      [['consent'], ['login', 'consent'], login, null, null, consent],
      [['consent'], ['login', 'consent'], login, null, null, nonExpiredConsent],
      [['consent'], ['login', 'consent'], login, null, 'id_token', consent],
      [['consent'], ['login', 'consent'], login, null, 'id_token', nonExpiredConsent],
      [['consent'], ['login', 'consent'], login, 0, null, consent],
      [['consent'], ['login', 'consent'], login, 0, null, nonExpiredConsent],
      [['consent'], ['login', 'consent'], login, 0, 'id_token', consent],
      [['consent'], ['login', 'consent'], login, 0, 'id_token', nonExpiredConsent],
      [['consent'], ['login', 'consent'], login, 300, null, consent],
      [['consent'], ['login', 'consent'], login, 300, null, nonExpiredConsent],
      [['consent'], ['login', 'consent'], login, 300, 'id_token', consent],
      [['consent'], ['login', 'consent'], login, 300, 'id_token', nonExpiredConsent],
      [['consent'], ['login', 'consent'], nonExpiredLogin, null, null, consent],
      [['consent'], ['login', 'consent'], nonExpiredLogin, null, null, nonExpiredConsent],
      [['consent'], ['login', 'consent'], nonExpiredLogin, null, 'id_token', consent],
      [['consent'], ['login', 'consent'], nonExpiredLogin, null, 'id_token', nonExpiredConsent],
      [['consent'], ['login', 'consent'], nonExpiredLogin, 0, null, consent],
      [['consent'], ['login', 'consent'], nonExpiredLogin, 0, null, nonExpiredConsent],
      [['consent'], ['login', 'consent'], nonExpiredLogin, 0, 'id_token', consent],
      [['consent'], ['login', 'consent'], nonExpiredLogin, 0, 'id_token', nonExpiredConsent],
      [['consent'], ['login', 'consent'], nonExpiredLogin, 300, null, consent],
      [['consent'], ['login', 'consent'], nonExpiredLogin, 300, null, nonExpiredConsent],
      [['consent'], ['login', 'consent'], nonExpiredLogin, 300, 'id_token', consent],
      [['consent'], ['login', 'consent'], nonExpiredLogin, 300, 'id_token', nonExpiredConsent],
    ];

    beforeEach(() => {
      displayMock.createHttpResponse.mockImplementationOnce((_, __) =>
        new HttpResponse().redirect(addParametersToUrl(_, __)),
      );

      responseModeMock.createHttpResponse.mockImplementationOnce(async (_, __) =>
        new HttpResponse().redirect(addParametersToUrl(_.redirectUri, __)),
      );

      responseTypeMock.handle.mockImplementationOnce(async (_) => ({ code: 'authorization_code' }));

      parameters = {
        response_type: 'code',
        client_id: 'client_id',
        redirect_uri: 'https://client.example.com/oidc/callback',
        scope: 'foo bar',
      };

      expiredLogin = Object.assign<Login, Partial<Login>>(new Login(), {
        id: 'login_id',
        expiresAt: new Date(Date.now() - 3600000),
      });

      oldLogin = Object.assign<Login, Partial<Login>>(new Login(), {
        id: 'login_id',
        createdAt: new Date(Date.now() - 3600000),
        expiresAt: null,
      });

      expiredConsent = Object.assign<Consent, Partial<Consent>>(new Consent(), {
        id: 'consent_id',
        expiresAt: new Date(Date.now() - 3600000),
      });
    });

    it('should return a Server Error Fatal Response.', async () => {
      const request = requestFactory();

      validatorMock.validate.mockImplementationOnce(() => {
        throw new Error('Mock Error.');
      });

      const response = await endpoint.handle(request);

      const error = new ServerErrorError('An unexpected error occurred.');
      const location = addParametersToUrl(settingsMock.interactions!.errorUrl, error.toJSON());

      expect(response.status).toBe(HttpResponseStatus.SeeOther);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(loggerMock.error).not.toHaveBeenCalled();
    });

    it('should return an Error Response when the provided parameter "response_type" is invalid.', async () => {
      const request = requestFactory({ response_type: undefined as any });
      const error = new InvalidRequestError('Invalid parameter "response_type".');

      const response = await endpoint.handle(request);

      const location = addParametersToUrl(settingsMock.interactions!.errorUrl, error.toJSON());

      expect(response.status).toBe(HttpResponseStatus.SeeOther);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[AuthorizationEndpoint] Invalid parameter "response_type"',
        '41df9486-e8d2-44ca-afaa-341e27c1cf25',
        { parameters },
        error,
      );
    });

    it('should return an Error Response when the provided parameter "response_type" is unsupported.', async () => {
      const request = requestFactory({ response_type: 'unknown' as ResponseTypeName });
      const error = new UnsupportedResponseTypeError('Unsupported Response Type "unknown".');

      const response = await endpoint.handle(request);

      const location = addParametersToUrl(settingsMock.interactions!.errorUrl, error.toJSON());

      expect(response.status).toBe(HttpResponseStatus.SeeOther);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[AuthorizationEndpoint] Unsupported Response Type "unknown"',
        'a63cff49-a503-42fb-a53f-c4fac3ce465b',
        { parameters },
        error,
      );
    });

    it('should return a Redirect Response to the Authorization Endpoint when no Session is found.', async () => {
      const request = requestFactory();

      const context = { parameters, session: null } as AuthorizationContext;

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
      });

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createSession.mockResolvedValueOnce(session);

      const response = await endpoint.handle(request);

      const location = addParametersToUrl('https://provider.example.com/oidc/authorization', request.query);

      expect(response.cookies).toStrictEqual<NodeJS.Dict<unknown>>({ guarani: session.id });
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.createSession).toHaveBeenCalledExactlyOnceWith();
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a Redirect Response to the Registration Page when the Prompt "create" is requested in a new Authorization process.', async () => {
      const request = requestFactory({ prompt: 'create' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        grant: null,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: ['create'],
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createGrant.mockResolvedValueOnce(grant);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/registration?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).toHaveBeenCalledExactlyOnceWith(parameters, client, session);
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a Redirect Response to the Registration Page when the Prompt "create" is requested and not yet processed.', async () => {
      const request = requestFactory({ prompt: 'create' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        grant,
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: ['create'],
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/registration?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return an Error Response when the Prompt "select_account" is requested in a new Authorization process and no previous Login is found.', async () => {
      const request = requestFactory({ prompt: 'select_account' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        logins: [],
        grant: null,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const context = {
        client,
        parameters,
        prompts: ['select_account'],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createGrant.mockResolvedValueOnce(grant);

      Reflect.set(settingsMock, 'enableAuthorizationResponseIssuerIdentifier', true);
      const response = await endpoint.handle(request);
      Reflect.deleteProperty(settingsMock, 'enableAuthorizationResponseIssuerIdentifier');

      const error = new LoginRequiredError('No Login found for Account Selection.');
      const location = addParametersToUrl(context.redirectUri, { ...error.toJSON(), iss: settingsMock.issuer!.href });

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.createGrant).toHaveBeenCalledExactlyOnceWith(parameters, client, session);
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return an Error Response when the Prompt "select_account" is requested and not yet processed and no previous Login is found.', async () => {
      const request = requestFactory({ prompt: 'select_account' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        logins: [],
        grant,
      });

      const context = {
        client,
        parameters,
        prompts: ['select_account'],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      const error = new LoginRequiredError('No Login found for Account Selection.');
      const location = addParametersToUrl(context.redirectUri, error.toJSON());

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return a Redirect Response to the Account Selection Page when the Prompt "select_account" is requested in a new Authorization process.', async () => {
      const request = requestFactory({ prompt: 'select_account' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        logins: [login],
        grant: null,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: ['select_account'],
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createGrant.mockResolvedValueOnce(grant);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/account-selection?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).toHaveBeenCalledExactlyOnceWith(parameters, client, session);
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a Redirect Response to the Account Selection Page when the Prompt "select_account" is requested and not yet processed.', async () => {
      const request = requestFactory({ prompt: 'select_account' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        logins: [login],
        grant,
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: ['select_account'],
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/account-selection?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return an Error Response when the Prompt "none" is requested in a new Authorization process and no previous Login is found.', async () => {
      const request = requestFactory({ prompt: 'none' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: null,
        logins: [],
        grant: null,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const context = {
        client,
        parameters,
        prompts: ['none'],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createGrant.mockResolvedValueOnce(grant);

      const response = await endpoint.handle(request);

      const error = new LoginRequiredError('No Login found.');
      const location = addParametersToUrl(context.redirectUri, error.toJSON());

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.createGrant).toHaveBeenCalledExactlyOnceWith(parameters, client, session);
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    // On paper this should never happen.
    it('should return an Error Response when the Prompt "none" is requested and not yet processed and no previous Login is found.', async () => {
      const request = requestFactory({ prompt: 'none' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: null,
        logins: [],
        grant,
      });

      const context = {
        client,
        parameters,
        prompts: ['none'],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      const error = new LoginRequiredError('No Login found.');
      const location = addParametersToUrl(context.redirectUri, error.toJSON());

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return a Redirect Response to the Login Page while invalidating the Active Login when the Prompt "login" is requested in a new Authorization process.', async () => {
      const request = requestFactory({ prompt: 'login' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant: null,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: ['login'],
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createGrant.mockResolvedValueOnce(grant);

      const inactivateMock = dataAccessMock.inactivateSessionActiveLogin.mockImplementationOnce(async (session) => {
        // capture the state of session before mutation since the check below matches against the mutated object.
        inactivateMock.mock.calls[inactivateMock.mock.calls.length - 1]![0] = { ...session };
        session.activeLogin = null;
      });

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/login?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).toHaveBeenCalledExactlyOnceWith(parameters, client, session);
      expect(dataAccessMock.inactivateSessionActiveLogin).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Session>({ ...session, activeLogin: login }),
      );
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a Redirect Response to the Login Page when the Prompt "login" is requested in a new Authorization process without an Active Login.', async () => {
      const request = requestFactory({ prompt: 'login' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: null,
        logins: [],
        grant: null,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: ['login'],
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createGrant.mockResolvedValueOnce(grant);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/login?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).toHaveBeenCalledExactlyOnceWith(parameters, client, session);
      expect(dataAccessMock.inactivateSessionActiveLogin).not.toHaveBeenCalled();
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a Redirect Response to the Login Page when the Prompt "login" is not requested in a new Authorization process without an Active Login.', async () => {
      const request = requestFactory({ prompt: 'login' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: null,
        logins: [],
        grant: null,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: [] as Prompt[],
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createGrant.mockResolvedValueOnce(grant);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/login?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).toHaveBeenCalledExactlyOnceWith(parameters, client, session);
      expect(dataAccessMock.inactivateSessionActiveLogin).not.toHaveBeenCalled();
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a Redirect Response to the Login Page when the Prompt "login" is requested and not yet processed without an Active Login.', async () => {
      const request = requestFactory({ prompt: 'login' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: null,
        logins: [],
        grant,
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: ['login'],
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/login?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.inactivateSessionActiveLogin).not.toHaveBeenCalled();
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a Redirect Response to the Login Page when the Prompt "login" is not requested in an existing Authorization process without an Active Login.', async () => {
      const request = requestFactory({ prompt: 'login' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: null,
        logins: [],
        grant,
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: [] as Prompt[],
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/login?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.inactivateSessionActiveLogin).not.toHaveBeenCalled();
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a Redirect Response to the Login Page when the Prompt "login" is requested and not yet processed with an Active Login.', async () => {
      const request = requestFactory({ prompt: 'login' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant,
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: ['login'],
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);

      const inactivateMock = dataAccessMock.inactivateSessionActiveLogin.mockImplementationOnce(async (session) => {
        // capture the state of session before mutation since the check below matches against the mutated object.
        inactivateMock.mock.calls[inactivateMock.mock.calls.length - 1]![0] = { ...session };
        session.activeLogin = null;
      });

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/login?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.inactivateSessionActiveLogin).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Session>({ ...session, activeLogin: login }),
      );
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return an Error Response when the Prompt "none" is requested in a new Authorization process with an expired Active Login.', async () => {
      const request = requestFactory({ prompt: 'none' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: expiredLogin,
        logins: [expiredLogin],
        grant: null,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const context = {
        client,
        parameters,
        prompts: ['none'],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createGrant.mockResolvedValueOnce(grant);

      const response = await endpoint.handle(request);

      const error = new LoginRequiredError('Login expired.');
      const location = addParametersToUrl(context.redirectUri, error.toJSON());

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.createGrant).toHaveBeenCalledExactlyOnceWith(parameters, client, session);
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return an Error Response when the Prompt "none" is requested and not yet processed with an expired Active Login.', async () => {
      const request = requestFactory({ prompt: 'none' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: expiredLogin,
        logins: [expiredLogin],
        grant,
      });

      const context = {
        client,
        parameters,
        prompts: ['none'],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      const error = new LoginRequiredError('Login expired.');
      const location = addParametersToUrl(context.redirectUri, error.toJSON());

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return a Redirect Response to the Login Page when the Prompt "none" is not requested in a new Authorization process with an expired Active Login.', async () => {
      const request = requestFactory({ prompt: 'none' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: expiredLogin,
        logins: [expiredLogin],
        grant: null,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: [] as Prompt[],
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createGrant.mockResolvedValueOnce(grant);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/login?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).toHaveBeenCalledExactlyOnceWith(parameters, client, session);
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a Redirect Response to the Login Page when the Prompt "none" is not requested in an existing Authorization process with an expired Active Login.', async () => {
      const request = requestFactory({ prompt: 'none' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: expiredLogin,
        logins: [expiredLogin],
        grant,
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: [] as Prompt[],
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/login?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return an Error Response when the Parameter "max_age" is 0 and the Prompt "none" is requested in a new Authorization process.', async () => {
      const request = requestFactory({ prompt: 'none', max_age: '0' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant: null,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const context = {
        client,
        maxAge: 0,
        parameters,
        prompts: ['none'],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createGrant.mockResolvedValueOnce(grant);

      const response = await endpoint.handle(request);

      const error = new LoginRequiredError('Login is too old.');
      const location = addParametersToUrl(context.redirectUri, error.toJSON());

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.createGrant).toHaveBeenCalledExactlyOnceWith(parameters, client, session);
      expect(dataAccessMock.logout).toHaveBeenCalledExactlyOnceWith(login, session);
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return an Error Response when the Parameter "max_age" is not 0 and the Prompt "none" is requested in a new Authorization process with an ancient Active Login.', async () => {
      const request = requestFactory({ prompt: 'none', max_age: '300' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: oldLogin,
        logins: [oldLogin],
        grant: null,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const context = {
        client,
        maxAge: 300,
        parameters,
        prompts: ['none'],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createGrant.mockResolvedValueOnce(grant);

      const response = await endpoint.handle(request);

      const error = new LoginRequiredError('Login is too old.');
      const location = addParametersToUrl(context.redirectUri, error.toJSON());

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.createGrant).toHaveBeenCalledExactlyOnceWith(parameters, client, session);
      expect(dataAccessMock.logout).toHaveBeenCalledExactlyOnceWith(oldLogin, session);
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return a Redirect Response to the Login Page when the Parameter "max_age" is 0 in a new Authorization process.', async () => {
      const request = requestFactory({ max_age: '0' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant: null,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const context = {
        client,
        display: displayMock as Display,
        maxAge: 0,
        parameters,
        prompts: [] as Prompt[],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createGrant.mockResolvedValueOnce(grant);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/login?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).toHaveBeenCalledExactlyOnceWith(parameters, client, session);
      expect(dataAccessMock.logout).toHaveBeenCalledExactlyOnceWith(login, session);
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a Redirect Response to the Login Page when the Parameter "max_age" is not 0 in a new Authorization process with an ancient Active Login.', async () => {
      const request = requestFactory({ max_age: '300' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: oldLogin,
        logins: [oldLogin],
        grant: null,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const context = {
        client,
        display: displayMock as Display,
        maxAge: 300,
        parameters,
        prompts: [] as Prompt[],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createGrant.mockResolvedValueOnce(grant);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/login?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).toHaveBeenCalledExactlyOnceWith(parameters, client, session);
      expect(dataAccessMock.logout).toHaveBeenCalledExactlyOnceWith(oldLogin, session);
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return an Error Response when the Parameter "max_age" is 0 and the Prompt "none" is requested and not yet processed.', async () => {
      const request = requestFactory({ prompt: 'none', max_age: '0' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant,
      });

      const context = {
        client,
        maxAge: 0,
        parameters,
        prompts: ['none'],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      const error = new LoginRequiredError('Login is too old.');
      const location = addParametersToUrl(context.redirectUri, error.toJSON());

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.logout).toHaveBeenCalledExactlyOnceWith(login, session);
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it.each(authenticationInteractions)(
      'should return an Error Response when the Parameter "max_age" is 0 and the Prompt "none" is requested and not yet processed with an ancient Active Login.',
      async (interaction) => {
        const request = requestFactory({ prompt: 'none', max_age: '0' });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
          id: 'grant_id',
          loginChallenge: 'login_challenge',
          interactions: [interaction],
        });

        const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
          id: 'session_id',
          activeLogin: oldLogin,
          logins: [oldLogin],
          grant,
        });

        const context = {
          client,
          maxAge: 0,
          parameters,
          prompts: ['none'],
          redirectUri: new URL('https://client.example.com/oidc/callback'),
          responseMode: responseModeMock as ResponseMode,
          session,
        } as AuthorizationContext;

        validatorMock.validate.mockResolvedValueOnce(context);

        const response = await endpoint.handle(request);

        const error = new LoginRequiredError('Login is too old.');
        const location = addParametersToUrl(context.redirectUri, error.toJSON());

        expect(response.status).toBe(error.status);
        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

        expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
        expect(dataAccessMock.logout).toHaveBeenCalledExactlyOnceWith(oldLogin, session);
        expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
      },
    );

    it.each(authenticationInteractions)(
      'should return an Error Response when the Parameter "max_age" is 300 and the Prompt "none" is requested and not yet processed with an ancient Active Login.',
      async (interaction) => {
        const request = requestFactory({ prompt: 'none', max_age: '300' });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
          id: 'grant_id',
          loginChallenge: 'login_challenge',
          interactions: [interaction],
        });

        const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
          id: 'session_id',
          activeLogin: oldLogin,
          logins: [oldLogin],
          grant,
        });

        const context = {
          client,
          maxAge: 300,
          parameters,
          prompts: ['none'],
          redirectUri: new URL('https://client.example.com/oidc/callback'),
          responseMode: responseModeMock as ResponseMode,
          session,
        } as AuthorizationContext;

        validatorMock.validate.mockResolvedValueOnce(context);

        const response = await endpoint.handle(request);

        const error = new LoginRequiredError('Login is too old.');
        const location = addParametersToUrl(context.redirectUri, error.toJSON());

        expect(response.status).toBe(error.status);
        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

        expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
        expect(dataAccessMock.logout).toHaveBeenCalledExactlyOnceWith(oldLogin, session);
        expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
      },
    );

    it('should return a Redirect Response to the Login Page when the Parameter "max_age" is 0 and not yet processed.', async () => {
      const request = requestFactory({ max_age: '0' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant,
      });

      const context = {
        client,
        display: displayMock as Display,
        maxAge: 0,
        parameters,
        prompts: [] as Prompt[],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/login?login_challenge=login_challenge',
      });

      expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.logout).toHaveBeenCalledExactlyOnceWith(login, session);
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it.each(authenticationInteractions)(
      'should return a Redirect Response to the Login Page when the Parameter "max_age" is 0 and not yet processed with an ancient Active Login.',
      async (interaction) => {
        const request = requestFactory({ max_age: '0' });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
          id: 'grant_id',
          loginChallenge: 'login_challenge',
          interactions: [interaction],
        });

        const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
          id: 'session_id',
          activeLogin: oldLogin,
          logins: [oldLogin],
          grant,
        });

        const context = {
          client,
          display: displayMock as Display,
          maxAge: 0,
          parameters,
          prompts: [] as Prompt[],
          redirectUri: new URL('https://client.example.com/oidc/callback'),
          session,
        } as AuthorizationContext;

        validatorMock.validate.mockResolvedValueOnce(context);

        const response = await endpoint.handle(request);

        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
          location: 'https://provider.example.com/oidc/login?login_challenge=login_challenge',
        });

        expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
        expect(dataAccessMock.logout).toHaveBeenCalledExactlyOnceWith(oldLogin, session);
        expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      },
    );

    it.each(authenticationInteractions)(
      'should return a Redirect Response to the Login Page when the Parameter "max_age" is 300 and not yet processed with an ancient Active Login.',
      async (interaction) => {
        const request = requestFactory({ max_age: '300' });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
          id: 'grant_id',
          loginChallenge: 'login_challenge',
          interactions: [interaction],
        });

        const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
          id: 'session_id',
          activeLogin: oldLogin,
          logins: [oldLogin],
          grant,
        });

        const context = {
          client,
          display: displayMock as Display,
          maxAge: 300,
          parameters,
          prompts: [] as Prompt[],
          redirectUri: new URL('https://client.example.com/oidc/callback'),
          session,
        } as AuthorizationContext;

        validatorMock.validate.mockResolvedValueOnce(context);

        const response = await endpoint.handle(request);

        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
          location: 'https://provider.example.com/oidc/login?login_challenge=login_challenge',
        });

        expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
        expect(dataAccessMock.logout).toHaveBeenCalledExactlyOnceWith(oldLogin, session);
        expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      },
    );

    it('should return an Error Response when the Parameter "id_token_hint" does not correspond to the Authenticated User in a new Authorization process.', async () => {
      const request = requestFactory({ id_token_hint: 'id_token_hint' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant: null,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const context = {
        client,
        idTokenHint: 'id_token_hint',
        parameters,
        prompts: [] as Prompt[],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.createGrant.mockResolvedValueOnce(grant);
      idTokenHandlerMock.checkIdTokenHint.mockResolvedValueOnce(false);

      const response = await endpoint.handle(request);

      const error = new LoginRequiredError('The Authenticated User is not the one expected by the ID Token Hint.');
      const location = addParametersToUrl(context.redirectUri, error.toJSON());

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.createGrant).toHaveBeenCalledExactlyOnceWith(parameters, client, session);
      expect(dataAccessMock.inactivateSessionActiveLogin).toHaveBeenCalledExactlyOnceWith(session);
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return an Error Response when the Parameter "id_token_hint" does not correspond to the Authenticated User in an ongoing Authorization process.', async () => {
      const request = requestFactory({ id_token_hint: 'id_token_hint' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant,
      });

      const context = {
        client,
        idTokenHint: 'id_token_hint',
        parameters,
        prompts: [] as Prompt[],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      idTokenHandlerMock.checkIdTokenHint.mockResolvedValueOnce(false);

      const response = await endpoint.handle(request);

      const error = new LoginRequiredError('The Authenticated User is not the one expected by the ID Token Hint.');
      const location = addParametersToUrl(context.redirectUri, error.toJSON());

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.inactivateSessionActiveLogin).toHaveBeenCalledExactlyOnceWith(session);
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return an Error Response when the Prompt "none" is requested and no previous Consent is found.', async () => {
      const request = requestFactory({ prompt: 'none' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        consentChallenge: 'consent_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant,
      });

      const context = {
        client,
        parameters,
        prompts: ['none'],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.findConsentByClientAndUser.mockResolvedValueOnce(null);

      const response = await endpoint.handle(request);

      const error = new ConsentRequiredError('No Consent found.');
      const location = addParametersToUrl(context.redirectUri, error.toJSON());

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return a Redirect Response to the Consent Page when no previous Consent is found.', async () => {
      const request = requestFactory();

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        consentChallenge: 'consent_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant,
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: [] as Prompt[],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.findConsentByClientAndUser.mockResolvedValueOnce(null);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/consent?consent_challenge=consent_challenge',
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a Redirect Response to the Consent Page when the Prompt "consent" is requested and no previous Consent is found.', async () => {
      const request = requestFactory({ prompt: 'consent' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        consentChallenge: 'consent_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant,
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: ['consent'],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.findConsentByClientAndUser.mockResolvedValueOnce(null);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/consent?consent_challenge=consent_challenge',
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a Redirect Response to the Consent Page when the Prompt "consent" is requested.', async () => {
      const request = requestFactory({ prompt: 'consent' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        consentChallenge: 'consent_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant,
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: ['consent'],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.findConsentByClientAndUser.mockResolvedValueOnce(consent);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/consent?consent_challenge=consent_challenge',
      });

      expect(dataAccessMock.removeConsent).toHaveBeenCalledExactlyOnceWith(consent);
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return an Error Response when the Prompt "none" is requested for a previous expired Consent.', async () => {
      const request = requestFactory({ prompt: 'none' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        consentChallenge: 'consent_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant,
      });

      const context = {
        client,
        parameters,
        prompts: ['none'],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.findConsentByClientAndUser.mockResolvedValueOnce(expiredConsent);

      const response = await endpoint.handle(request);

      const error = new ConsentRequiredError('Consent expired.');
      const location = addParametersToUrl(context.redirectUri, error.toJSON());

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.removeConsent).toHaveBeenCalledExactlyOnceWith(expiredConsent);
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return a Redirect Response to the Consent Page for a previous expired Consent.', async () => {
      const request = requestFactory();

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        consentChallenge: 'consent_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant,
      });

      const context = {
        client,
        display: displayMock as Display,
        parameters,
        prompts: [] as Prompt[],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.findConsentByClientAndUser.mockResolvedValueOnce(expiredConsent);

      const response = await endpoint.handle(request);

      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://provider.example.com/oidc/consent?consent_challenge=consent_challenge',
      });

      expect(dataAccessMock.removeConsent).toHaveBeenCalledExactlyOnceWith(expiredConsent);
      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return an Error Response in an ongoing Authorization process with an expired Consent.', async () => {
      const request = requestFactory();

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        consentChallenge: 'consent_challenge',
        interactions: ['consent'],
        consent: expiredConsent,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant,
      });

      const context = {
        client,
        parameters,
        prompts: [] as Prompt[],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      const error = new ConsentRequiredError('Consent expired.');
      const location = addParametersToUrl(context.redirectUri, error.toJSON());

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.findConsentByClientAndUser).not.toHaveBeenCalled();
      expect(dataAccessMock.removeConsent).toHaveBeenCalledExactlyOnceWith(expiredConsent);
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return an Error Response when the Prompt "consent" is requested in an ongoing Authorization process with an expired Consent.', async () => {
      const request = requestFactory({ prompt: 'consent' });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        consentChallenge: 'consent_challenge',
        interactions: ['consent'],
        consent: expiredConsent,
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant,
      });

      const context = {
        client,
        parameters,
        prompts: ['consent'],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        session,
      } as AuthorizationContext;

      validatorMock.validate.mockResolvedValueOnce(context);

      const response = await endpoint.handle(request);

      const error = new ConsentRequiredError('Consent expired.');
      const location = addParametersToUrl(context.redirectUri, error.toJSON());

      expect(response.status).toBe(error.status);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.findConsentByClientAndUser).not.toHaveBeenCalled();
      expect(dataAccessMock.removeConsent).toHaveBeenCalledExactlyOnceWith(expiredConsent);
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it.each(happyPathsConditions)(
      'should return an Authorization Response.',
      async (prompts, interactions, login, maxAge, idTokenHint, consent) => {
        const request = requestFactory();

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
          id: 'grant_id',
          loginChallenge: 'login_challenge',
          consentChallenge: 'consent_challenge',
          interactions,
          consent: interactions.includes('consent') ? consent : null,
        });

        const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
          id: 'session_id',
          activeLogin: login,
          logins: [login],
          grant,
        });

        const context = {
          client,
          idTokenHint,
          maxAge,
          parameters,
          prompts,
          redirectUri: new URL('https://client.example.com/oidc/callback'),
          responseMode: responseModeMock as ResponseMode,
          responseType: responseTypeMock as ResponseType,
          session,
        } as AuthorizationContext;

        const authorizationResponse: AuthorizationResponse = { code: 'authorization_code' };

        validatorMock.validate.mockResolvedValueOnce(context);

        if (typeof idTokenHint === 'string') {
          idTokenHandlerMock.checkIdTokenHint.mockResolvedValueOnce(true);
        }

        if (!interactions.includes('consent')) {
          dataAccessMock.findConsentByClientAndUser.mockResolvedValueOnce(consent);
        }

        const response = await endpoint.handle(request);

        const location = addParametersToUrl(new URL(context.redirectUri.href), authorizationResponse);

        expect(response.status).toBe(303);
        expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

        expect(dataAccessMock.createSession).not.toHaveBeenCalled();
        expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
        expect(dataAccessMock.inactivateSessionActiveLogin).not.toHaveBeenCalled();
        expect(dataAccessMock.logout).not.toHaveBeenCalled();
        expect(dataAccessMock.removeConsent).not.toHaveBeenCalled();
        expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
      },
    );

    it('should return an Authorization Response with the Authorization Response Issuer Identifier.', async () => {
      const request = requestFactory();

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        loginChallenge: 'login_challenge',
        consentChallenge: 'consent_challenge',
        interactions: [],
      });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
        logins: [login],
        grant,
      });

      const context = {
        client,
        parameters,
        prompts: [] as Prompt[],
        redirectUri: new URL('https://client.example.com/oidc/callback'),
        responseMode: responseModeMock as ResponseMode,
        responseType: responseTypeMock as ResponseType,
        session,
      } as AuthorizationContext;

      const authorizationResponse: AuthorizationResponse = {
        code: 'authorization_code',
        iss: settingsMock.issuer!.href,
      };

      validatorMock.validate.mockResolvedValueOnce(context);
      dataAccessMock.findConsentByClientAndUser.mockResolvedValueOnce(consent);

      Reflect.set(settingsMock, 'enableAuthorizationResponseIssuerIdentifier', true);
      const response = await endpoint.handle(request);
      Reflect.deleteProperty(settingsMock, 'enableAuthorizationResponseIssuerIdentifier');

      const location = addParametersToUrl(new URL(context.redirectUri.href), authorizationResponse);

      expect(response.status).toBe(303);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ location: location.href });

      expect(dataAccessMock.createSession).not.toHaveBeenCalled();
      expect(dataAccessMock.createGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.inactivateSessionActiveLogin).not.toHaveBeenCalled();
      expect(dataAccessMock.logout).not.toHaveBeenCalled();
      expect(dataAccessMock.removeConsent).not.toHaveBeenCalled();
      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });
  });
});
