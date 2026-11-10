import http from 'http';
import qs from 'querystring';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../src/lib/constants';
import { DataAccess } from '../src/lib/data-access/data-access';
import { SQLiteDataAccess } from '../src/lib/data-access/sqlite/sqlite.data-access';
import { AccessToken } from '../src/lib/entities/access-token';
import { RefreshToken } from '../src/lib/entities/refresh-token';
import { NodeIdentityProvider } from '../src/lib/http/providers/node/node.identity-provider';
import { HttpResponseStatus } from '../src/lib/http/response/http-response-status.enum';
import { IntrospectionRequest } from '../src/lib/requests/introspection/introspection-request';
import { PasswordTokenRequest } from '../src/lib/requests/token/password/password.token-request';
import { IntrospectionResponse } from '../src/lib/responses/introspection/introspection-response';
import { Settings } from '../src/lib/settings/settings';
import { createTestProvider } from './__fixtures__/create-test-provider';

describe('Introspection Endpoint', () => {
  let server: http.Server;
  let agent: TestAgent;
  let provider: NodeIdentityProvider;

  let settings: Settings;
  let dataAccess: SQLiteDataAccess;

  const container = getContainer(CONTAINER);

  let accessToken: AccessToken;
  let refreshToken: RefreshToken;

  beforeAll(async () => {
    provider = await createTestProvider();

    settings = container.resolve(Settings);
    dataAccess = container.resolve(DataAccess) as SQLiteDataAccess;

    server = http.createServer(provider.handle());
    agent = request.agent(server);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await dataAccess.down();
    container.clear();
  });

  it('POST /oidc/token (Get Access Token)', async () => {
    const tokenRequest: PasswordTokenRequest = {
      grant_type: 'password',
      username: 'john.doe@email.com',
      password: 'secretpassword',
      scope: 'foo bar baz qux',
    };

    const tokenRequestBody = qs.stringify(tokenRequest);

    const tokenResponse = await agent
      .post('/oidc/token')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(tokenRequestBody);

    accessToken = (await dataAccess.findAccessTokenById(tokenResponse.body.access_token))!;
    refreshToken = (await dataAccess.findRefreshTokenById(tokenResponse.body.refresh_token))!;

    expect(accessToken.revokedAt).toBeNull();
    expect(refreshToken.revokedAt).toBeNull();
  });

  it('POST /oidc/introspection (Access Token)', async () => {
    const requestData: IntrospectionRequest = { token: accessToken.id, token_type_hint: 'access_token' };
    const requestBody = qs.stringify(requestData);

    const introspectionResponse = await agent
      .post('/oidc/introspection')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(requestBody);

    expect(introspectionResponse.status).toEqual(HttpResponseStatus.OK);

    expect(introspectionResponse.body).toStrictEqual<IntrospectionResponse>({
      active: true,
      scope: accessToken.scopes.map((scope) => scope.name).join(' '),
      client_id: accessToken.client!.id,
      username: accessToken.user!.preferredUsername!,
      token_type: 'Bearer',
      exp: expect.toBeNumber(),
      iat: expect.toBeNumber(),
      nbf: expect.toBeNumber(),
      sub: 'km5z-aWmXY6Gig4YbFIEdIOVWxc2R1ew03RXaI7QUkGClFewSegH4IsaQuBjnvykiOpClXegrOkZhXErM_hUjg',
      aud: accessToken.client!.id,
      iss: settings.issuer.href,
      jti: expect.toBeString(),
    });
  });

  it('POST /oidc/introspection (Refresh Token)', async () => {
    const requestData: IntrospectionRequest = { token: refreshToken.id, token_type_hint: 'refresh_token' };
    const requestBody = qs.stringify(requestData);

    const introspectionResponse = await agent
      .post('/oidc/introspection')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(requestBody);

    expect(introspectionResponse.status).toEqual(HttpResponseStatus.OK);

    expect(introspectionResponse.body).toStrictEqual<IntrospectionResponse>({
      active: true,
      scope: refreshToken.scopes.map((scope) => scope.name).join(' '),
      client_id: refreshToken.client.id,
      username: refreshToken.user.preferredUsername!,
      exp: expect.toBeNumber(),
      iat: expect.toBeNumber(),
      nbf: expect.toBeNumber(),
      sub: 'km5z-aWmXY6Gig4YbFIEdIOVWxc2R1ew03RXaI7QUkGClFewSegH4IsaQuBjnvykiOpClXegrOkZhXErM_hUjg',
      aud: refreshToken.client.id,
      iss: settings.issuer.href,
      jti: expect.toBeString(),
    });
  });
});
