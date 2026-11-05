import http from 'http';
import request, { Agent } from 'supertest';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../src/lib/constants';
import { DataAccess } from '../src/lib/data-access/data-access';
import { SQLiteDataAccess } from '../src/lib/data-access/sqlite/sqlite.data-access';
import { NodeIdentityProvider } from '../src/lib/http/providers/node/node.identity-provider';
import { HttpResponseStatus } from '../src/lib/http/response/http-response-status.enum';
import { DiscoveryResponse } from '../src/lib/responses/discovery/discovery-response';
import { createTestProvider } from './support/create-test-provider';

describe('Discovery Endpoint', () => {
  let server: http.Server;
  let agent: Agent;
  let provider: NodeIdentityProvider;
  let dataAccess: SQLiteDataAccess;

  const container = getContainer(CONTAINER);

  beforeAll(async () => {
    provider = await createTestProvider();

    dataAccess = container.resolve(DataAccess) as SQLiteDataAccess;

    server = http.createServer(provider.handle);
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
      response_types_supported: ['code', 'id_token'],
      response_modes_supported: ['fragment', 'query'],
      interaction_types_supported: ['consent', 'create', 'login', 'select_account'],
      grant_types_supported: ['authorization_code'],
      acr_values_supported: ['urn:guarani:acr:1fa', 'urn:guarani:acr:2fa'],
      subject_types_supported: ['pairwise', 'public'],
      id_token_signing_alg_values_supported: ['ES256'],
      id_token_encryption_alg_values_supported: ['RSA-OAEP'],
      id_token_encryption_enc_values_supported: ['A128GCM'],
      token_endpoint_auth_methods_supported: ['client_secret_basic'],
      prompt_values_supported: ['consent', 'create', 'login', 'none', 'select_account'],
      display_values_supported: ['page'],
      ui_locales_supported: ['en-US'],
      code_challenge_methods_supported: ['S256'],
      authorization_response_iss_parameter_supported: false,
      interaction_endpoint_auth_methods_supported: ['client_secret_basic'],
    });
  });
});
