import http from 'http';
import request, { Agent } from 'supertest';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../src/lib/constants';
import { DataAccess } from '../src/lib/data-access/data-access';
import { SQLiteDataAccess } from '../src/lib/data-access/sqlite/sqlite.data-access';
import { NodeIdentityProvider } from '../src/lib/http/providers/node/node.identity-provider';
import { HttpResponseStatus } from '../src/lib/http/response/http-response-status.enum';
import { DiscoveryResponse } from '../src/lib/responses/discovery/discovery-response';
import { createTestProvider } from './__fixtures__/create-test-provider';

describe('Discovery Endpoint', () => {
  let server: http.Server;
  let agent: Agent;
  let provider: NodeIdentityProvider;
  let dataAccess: SQLiteDataAccess;

  const container = getContainer(CONTAINER);

  beforeAll(async () => {
    provider = await createTestProvider();

    dataAccess = container.resolve(DataAccess) as SQLiteDataAccess;

    server = http.createServer(provider.handle());
    agent = request.agent(server);
  });

  afterAll(async () => {
    await dataAccess.down();
    container.clear();
  });

  it('GET /.well-known/openid-configuration', async () => {
    const discoveryResponse = await agent.get('/.well-known/openid-configuration');

    expect(discoveryResponse.status).toBe(HttpResponseStatus.OK);
    expect(discoveryResponse.body).toStrictEqual<DiscoveryResponse>({
      issuer: 'https://provider.example.com/',
      authorization_endpoint: 'https://provider.example.com/oidc/authorization',
      interaction_endpoint: 'https://provider.example.com/oidc/interaction',
      token_endpoint: 'https://provider.example.com/oidc/token',
      revocation_endpoint: 'https://provider.example.com/oidc/revocation',
      scopes_supported: [
        'openid',
        'profile',
        'email',
        'phone',
        'address',
        'offline_access',
        'foo',
        'bar',
        'baz',
        'qux',
      ],
      response_types_supported: [
        'code',
        'code id_token',
        'code id_token token',
        'code token',
        'id_token',
        'id_token token',
        'none',
        'token',
      ],
      response_modes_supported: ['form_post', 'fragment', 'query'],
      interaction_types_supported: ['consent', 'create', 'login', 'select_account'],
      grant_types_supported: [
        'authorization_code',
        'client_credentials',
        'password',
        'refresh_token',
        'urn:ietf:params:oauth:grant-type:jwt-bearer',
      ],
      acr_values_supported: ['urn:guarani:acr:1fa', 'urn:guarani:acr:2fa'],
      subject_types_supported: ['pairwise', 'public'],
      id_token_signing_alg_values_supported: ['RS256'],
      id_token_encryption_alg_values_supported: ['RSA-OAEP'],
      id_token_encryption_enc_values_supported: ['A128GCM'],
      jwt_bearer_grant_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic'],
      prompt_values_supported: ['consent', 'create', 'login', 'none', 'select_account'],
      display_values_supported: ['page', 'popup', 'touch', 'wap'],
      ui_locales_supported: ['en-US'],
      code_challenge_methods_supported: ['S256', 'plain'],
      authorization_response_iss_parameter_supported: false,
      interaction_endpoint_auth_methods_supported: ['client_secret_basic'],
      revocation_endpoint_auth_methods_supported: ['client_secret_basic'],
      introspection_endpoint_auth_methods_supported: ['client_secret_basic'],
    });
  });
});
