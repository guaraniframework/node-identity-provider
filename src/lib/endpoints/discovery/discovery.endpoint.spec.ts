import { Buffer } from 'buffer';
import { OutgoingHttpHeaders } from 'http';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { jsonStringify } from '@guarani/primitives';

import { ClientAuthentication } from '../../client-authentication/client-authentication';
import {
  CONTAINER,
  INTERACTION_CLIENT_AUTHENTICATION,
  INTROSPECTION_CLIENT_AUTHENTICATION,
  REVOCATION_CLIENT_AUTHENTICATION,
  TOKEN_CLIENT_AUTHENTICATION,
} from '../../constants';
import { DataAccess } from '../../data-access/data-access';
import { Display } from '../../displays/display';
import { Scope } from '../../entities/scope';
import { GrantType } from '../../grant-types/grant-type';
import { IdentityProvider } from '../../http/providers/identity-provider';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { HttpRoute } from '../../http/route/http-route';
import { InteractionType } from '../../interaction-types/interaction-type';
import { Logger } from '../../loggers/logger';
import { PKCE } from '../../pkces/pkce';
import { ResponseMode } from '../../response-modes/response-mode';
import { ResponseType } from '../../response-types/response-type';
import { DiscoveryResponse } from '../../responses/discovery/discovery-response';
import { Settings } from '../../settings/settings';
import { SubjectType } from '../../subject-types/subject-type';
import { Endpoint } from '../endpoint';
import { EndpointName } from '../endpoint-name.type';
import { DiscoveryEndpoint } from './discovery.endpoint';

jest.mock('../../loggers/logger');

describe('Discovery Endpoint', () => {
  let endpoint: DiscoveryEndpoint;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      getScopes: jest.fn(),
    }),
  );

  let settingsMock: jest.MockedObjectDeep<Settings>;

  let providerMock: jest.MockedObjectDeep<IdentityProvider>;

  const responseTypeMock = jest.mocked<ResponseType>(
    Object.assign<ResponseType, Partial<ResponseType>>(Reflect.construct(ResponseType, []), { name: 'code' }),
  );

  const responseModeMock = jest.mocked<ResponseMode>(
    Object.assign<ResponseMode, Partial<ResponseMode>>(Reflect.construct(ResponseMode, []), { name: 'query' }),
  );

  const interactionTypeMock = jest.mocked<InteractionType>(
    Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), { name: 'login' }),
  );

  const grantTypeMock = jest.mocked<GrantType>(
    Object.assign<GrantType, Partial<GrantType>>(Reflect.construct(GrantType, []), { name: 'authorization_code' }),
  );

  const subjectTypeMock = jest.mocked<SubjectType>(
    Object.assign<SubjectType, Partial<SubjectType>>(Reflect.construct(SubjectType, []), { name: 'public' }),
  );

  const clientAuthenticationMethodsMock = [
    jest.mocked<ClientAuthentication>(
      Object.assign<ClientAuthentication, Partial<ClientAuthentication>>(Reflect.construct(ClientAuthentication, []), {
        name: 'client_secret_basic',
      }),
    ),
    jest.mocked<ClientAuthentication>(
      Object.assign<ClientAuthentication, Partial<ClientAuthentication>>(Reflect.construct(ClientAuthentication, []), {
        name: 'private_key_jwt',
      }),
    ),
  ];

  const displayMock = jest.mocked<Display>(
    Object.assign<Display, Partial<Display>>(Reflect.construct(Display, []), { name: 'page' }),
  );

  const pkceMock = jest.mocked<PKCE>(Object.assign<PKCE, Partial<PKCE>>(Reflect.construct(PKCE, []), { name: 'S256' }));

  beforeEach(() => {
    settingsMock = jest.mocked<Settings>(
      Object.assign<Settings, Partial<Settings>>(Object.create(Settings.prototype), {
        issuer: new URL('https://provider.example.com'),
        idTokenSignatureAlgorithms: ['ES256'],
        idTokenKeyWrapAlgorithms: ['RSA-OAEP'],
        idTokenContentEncryptionAlgorithms: ['A128GCM'],
        clientAuthenticationSigningAlgorithms: ['ES256'],
        clientAuthenticationEncryptionKeyWrapAlgorithms: ['RSA-OAEP'],
        clientAuthenticationEncryptionContentEncryptionAlgorithms: ['A128GCM'],
        jwtBearerGrantSigningAlgorithms: ['ES256'],
        jwtBearerGrantEncryptionKeyWrapAlgorithms: ['RSA-OAEP'],
        jwtBearerGrantEncryptionContentEncryptionAlgorithms: ['A128GCM'],
        uiLocales: ['en-US', 'fr-CA'],
        acrValues: ['urn:guarani:acr:1fa', 'urn:guarani:acr:2fa'],
        enableAuthorizationResponseIssuerIdentifier: true,
      }),
    );

    providerMock = jest.mocked<IdentityProvider>(
      Object.assign<IdentityProvider, Partial<IdentityProvider>>(Reflect.construct(IdentityProvider, []), {
        endpoints: [
          jest.mocked<Endpoint>(
            Object.assign<Endpoint, Partial<Endpoint>>(Reflect.construct(Endpoint, []), {
              name: 'authorization',
              path: '/oidc/authorization',
            }),
          ),
          jest.mocked<Endpoint>(
            Object.assign<Endpoint, Partial<Endpoint>>(Reflect.construct(Endpoint, []), {
              name: 'interaction',
              path: '/oidc/interaction',
            }),
          ),
          jest.mocked<Endpoint>(
            Object.assign<Endpoint, Partial<Endpoint>>(Reflect.construct(Endpoint, []), {
              name: 'introspection',
              path: '/oidc/introspection',
            }),
          ),
          jest.mocked<Endpoint>(
            Object.assign<Endpoint, Partial<Endpoint>>(Reflect.construct(Endpoint, []), {
              name: 'revocation',
              path: '/oidc/revocation',
            }),
          ),
          jest.mocked<Endpoint>(
            Object.assign<Endpoint, Partial<Endpoint>>(Reflect.construct(Endpoint, []), {
              name: 'token',
              path: '/oidc/token',
            }),
          ),
        ],
      }),
    );

    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(Settings).toValue(settingsMock);
    container.bind(IdentityProvider).toValue(providerMock);
    container.bind(ResponseType).toValue(responseTypeMock);
    container.bind(ResponseMode).toValue(responseModeMock);
    container.bind(InteractionType).toValue(interactionTypeMock);
    container.bind(GrantType).toValue(grantTypeMock);
    container.bind(SubjectType).toValue(subjectTypeMock);

    clientAuthenticationMethodsMock.forEach((clientAuthenticationMethodMock) => {
      container.bind<ClientAuthentication>(TOKEN_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
      container.bind<ClientAuthentication>(INTERACTION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
      container.bind<ClientAuthentication>(REVOCATION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
      container.bind<ClientAuthentication>(INTROSPECTION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
    });

    container.bind(Display).toValue(displayMock);
    container.bind(PKCE).toValue(pkceMock);
    container.bind(DiscoveryEndpoint).toSelf().asSingleton();

    endpoint = container.resolve(DiscoveryEndpoint);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "discovery" as its value.', () => {
      expect(endpoint.name).toBe<EndpointName>('discovery');
    });
  });

  describe('path', () => {
    it('should have "/.well-known/openid-configuration" as its value.', () => {
      expect(endpoint.path).toBe('/.well-known/openid-configuration');
    });
  });

  describe('routes', () => {
    it('should have a GET route as its value.', () => {
      expect(endpoint.routes).toStrictEqual<HttpRoute[]>([{ method: HttpRequestMethod.GET, handler: endpoint.handle }]);
    });
  });

  describe('handle()', () => {
    it('should return a Discovery Response with minimal parameters.', async () => {
      Reflect.set(settingsMock, 'idTokenSignatureAlgorithms', []);
      Reflect.set(settingsMock, 'idTokenKeyWrapAlgorithms', []);
      Reflect.set(settingsMock, 'idTokenContentEncryptionAlgorithms', []);
      Reflect.set(settingsMock, 'clientAuthenticationSigningAlgorithms', []);
      Reflect.set(settingsMock, 'clientAuthenticationEncryptionKeyWrapAlgorithms', []);
      Reflect.set(settingsMock, 'clientAuthenticationEncryptionContentEncryptionAlgorithms', []);
      Reflect.set(settingsMock, 'jwtBearerGrantSigningAlgorithms', []);
      Reflect.set(settingsMock, 'jwtBearerGrantEncryptionKeyWrapAlgorithms', []);
      Reflect.set(settingsMock, 'jwtBearerGrantEncryptionContentEncryptionAlgorithms', []);
      Reflect.set(settingsMock, 'acrValues', []);
      Reflect.set(settingsMock, 'uiLocales', []);

      Reflect.set(
        providerMock,
        'endpoints',
        providerMock.endpoints.filter((endpoint) => ['authorization', 'interaction', 'token'].includes(endpoint.name)),
      );

      container.clear();

      const clientAuthenticationMethodMock = clientAuthenticationMethodsMock.pop()!;

      container.bind(Logger).toValue(loggerMock);
      container.bind(DataAccess).toValue(dataAccessMock);
      container.bind(Settings).toValue(settingsMock);
      container.bind(IdentityProvider).toValue(providerMock);
      container.bind(ResponseType).toValue(responseTypeMock);
      container.bind(ResponseMode).toValue(responseModeMock);
      container.bind(InteractionType).toValue(interactionTypeMock);
      container.bind(GrantType).toValue(grantTypeMock);
      container.bind(SubjectType).toValue(subjectTypeMock);

      clientAuthenticationMethodsMock.forEach((clientAuthenticationMethodMock) => {
        container.bind<ClientAuthentication>(TOKEN_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
        container.bind<ClientAuthentication>(INTERACTION_CLIENT_AUTHENTICATION).toValue(clientAuthenticationMethodMock);
      });

      container.bind(Display).toValue(displayMock);
      container.bind(PKCE).toValue(pkceMock);
      container.bind(DiscoveryEndpoint).toSelf().asSingleton();

      endpoint = container.resolve(DiscoveryEndpoint);

      const scopes = ['openid', 'profile', 'email', 'phone', 'address'];

      const discoveryResponse: DiscoveryResponse = {
        issuer: 'https://provider.example.com/',
        authorization_endpoint: 'https://provider.example.com/oidc/authorization',
        interaction_endpoint: 'https://provider.example.com/oidc/interaction',
        token_endpoint: 'https://provider.example.com/oidc/token',
        scopes_supported: scopes,
        response_types_supported: ['code'],
        response_modes_supported: ['query'],
        interaction_types_supported: ['login'],
        grant_types_supported: ['authorization_code'],
        subject_types_supported: ['public'],
        token_endpoint_auth_methods_supported: ['client_secret_basic'],
        prompt_values_supported: ['consent', 'create', 'login', 'none', 'select_account'],
        display_values_supported: ['page'],
        code_challenge_methods_supported: ['S256'],
        authorization_response_iss_parameter_supported: true,
        interaction_endpoint_auth_methods_supported: ['client_secret_basic'],
      };

      dataAccessMock.getScopes.mockResolvedValueOnce(
        scopes.map((name) => Object.assign<Scope, Partial<Scope>>(new Scope(), { name })),
      );

      const response = await endpoint.handle(expect.any(HttpRequest));

      expect(response.status).toBe(HttpResponseStatus.OK);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ 'content-type': 'application/json' });
      expect(response.body).toStrictEqual(Buffer.from(jsonStringify(discoveryResponse), 'utf8'));

      clientAuthenticationMethodsMock.push(clientAuthenticationMethodMock);
    });

    it('should return a Discovery Response with all parameters.', async () => {
      const scopes = ['openid', 'profile', 'email', 'phone', 'address'];

      const discoveryResponse: DiscoveryResponse = {
        issuer: 'https://provider.example.com/',
        authorization_endpoint: 'https://provider.example.com/oidc/authorization',
        interaction_endpoint: 'https://provider.example.com/oidc/interaction',
        token_endpoint: 'https://provider.example.com/oidc/token',
        revocation_endpoint: 'https://provider.example.com/oidc/revocation',
        scopes_supported: scopes,
        response_types_supported: ['code'],
        response_modes_supported: ['query'],
        interaction_types_supported: ['login'],
        grant_types_supported: ['authorization_code'],
        acr_values_supported: ['urn:guarani:acr:1fa', 'urn:guarani:acr:2fa'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['ES256'],
        id_token_encryption_alg_values_supported: ['RSA-OAEP'],
        id_token_encryption_enc_values_supported: ['A128GCM'],
        token_endpoint_auth_methods_supported: ['client_secret_basic', 'private_key_jwt'],
        token_endpoint_auth_signing_alg_values_supported: ['ES256'],
        token_endpoint_auth_encryption_alg_values_supported: ['RSA-OAEP'],
        token_endpoint_auth_encryption_enc_values_supported: ['A128GCM'],
        jwt_bearer_grant_signing_alg_values_supported: ['ES256'],
        jwt_bearer_grant_encryption_alg_values_supported: ['RSA-OAEP'],
        jwt_bearer_grant_encryption_enc_values_supported: ['A128GCM'],
        prompt_values_supported: ['consent', 'create', 'login', 'none', 'select_account'],
        display_values_supported: ['page'],
        ui_locales_supported: ['en-US', 'fr-CA'],
        code_challenge_methods_supported: ['S256'],
        authorization_response_iss_parameter_supported: true,
        interaction_endpoint_auth_methods_supported: ['client_secret_basic', 'private_key_jwt'],
        interaction_endpoint_auth_signing_alg_values_supported: ['ES256'],
        interaction_endpoint_auth_encryption_alg_values_supported: ['RSA-OAEP'],
        interaction_endpoint_auth_encryption_enc_values_supported: ['A128GCM'],
        revocation_endpoint_auth_methods_supported: ['client_secret_basic', 'private_key_jwt'],
        revocation_endpoint_auth_signing_alg_values_supported: ['ES256'],
        revocation_endpoint_auth_encryption_alg_values_supported: ['RSA-OAEP'],
        revocation_endpoint_auth_encryption_enc_values_supported: ['A128GCM'],
        introspection_endpoint_auth_methods_supported: ['client_secret_basic', 'private_key_jwt'],
        introspection_endpoint_auth_signing_alg_values_supported: ['ES256'],
        introspection_endpoint_auth_encryption_alg_values_supported: ['RSA-OAEP'],
        introspection_endpoint_auth_encryption_enc_values_supported: ['A128GCM'],
      };

      dataAccessMock.getScopes.mockResolvedValueOnce(
        scopes.map((name) => Object.assign<Scope, Partial<Scope>>(new Scope(), { name })),
      );

      const response = await endpoint.handle(expect.any(HttpRequest));

      expect(response.status).toBe(HttpResponseStatus.OK);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ 'content-type': 'application/json' });
      expect(response.body).toStrictEqual(Buffer.from(jsonStringify(discoveryResponse), 'utf8'));
    });
  });
});
