import http from 'http';
import qs from 'querystring';
import request, { Agent } from 'supertest';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../src/lib/constants';
import { DataAccess } from '../../src/lib/data-access/data-access';
import { SQLiteDataAccess } from '../../src/lib/data-access/sqlite/sqlite.data-access';
import { Scope } from '../../src/lib/entities/scope';
import { NodeIdentityProvider } from '../../src/lib/http/providers/node/node.identity-provider';
import { HttpResponseStatus } from '../../src/lib/http/response/http-response-status.enum';
import { ClientCredentialsTokenRequest } from '../../src/lib/requests/token/client-credentials/client-credentials.token-request';
import { ClientCredentialsTokenResponse } from '../../src/lib/responses/token/client-credentials/client-credentials.token-response';
import { createTestProvider } from '../__fixtures__/create-test-provider';

describe('Client Credentials Flow', () => {
  let provider: NodeIdentityProvider;
  let server: http.Server;
  let agent: Agent;

  let dataAccess: SQLiteDataAccess;

  const container = getContainer(CONTAINER);

  let scopes: Scope[];

  const tokenRequest: ClientCredentialsTokenRequest = { grant_type: 'client_credentials', scope: 'foo bar baz qux' };
  const tokenRequestBody = qs.stringify(tokenRequest);

  beforeAll(async () => {
    provider = await createTestProvider();

    dataAccess = container.resolve(DataAccess) as SQLiteDataAccess;

    server = http.createServer(provider.handle());
    agent = request.agent(server);

    scopes = await dataAccess.getScopesByName(tokenRequest.scope!.split(' '));
  });

  afterAll(async () => {
    await dataAccess.down();
    container.clear();
  });

  it('POST /oidc/token (Get Access Token)', async () => {
    const tokenResponse = await agent
      .post('/oidc/token')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(tokenRequestBody);

    expect(tokenResponse.status).toEqual(HttpResponseStatus.OK);
    expect(tokenResponse.body).toStrictEqual<ClientCredentialsTokenResponse>({
      access_token: expect.toBeString(),
      token_type: 'Bearer',
      expires_in: expect.toBeNumber(),
      scope: 'bar baz foo qux',
    });

    const accessToken = (await dataAccess.findAccessTokenById(tokenResponse.body.access_token))!;

    expect(accessToken.scopes).toStrictEqual<Scope[]>(expect.arrayContaining(scopes));
    expect(accessToken.client!.id).toBe('b1eeace9-2b0c-468e-a444-733befc3b35d');
    expect(accessToken.user).toBeNull();
    expect(accessToken.login).toBeNull();
  });
});
