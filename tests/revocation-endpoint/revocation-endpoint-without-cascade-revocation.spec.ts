import http from 'http';
import qs from 'querystring';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../src/lib/constants';
import { DataAccess } from '../../src/lib/data-access/data-access';
import { SQLiteDataAccess } from '../../src/lib/data-access/sqlite/sqlite.data-access';
import { AccessToken } from '../../src/lib/entities/access-token';
import { RefreshToken } from '../../src/lib/entities/refresh-token';
import { NodeIdentityProvider } from '../../src/lib/http/providers/node/node.identity-provider';
import { HttpResponseStatus } from '../../src/lib/http/response/http-response-status.enum';
import { RevocationRequest } from '../../src/lib/requests/revocation/revocation-request';
import { PasswordTokenRequest } from '../../src/lib/requests/token/password/password.token-request';
import { createTestProvider } from '../__fixtures__/create-test-provider';

describe('Revocation Endpoint without Cascade Revocation', () => {
  let server: http.Server;
  let agent: TestAgent;
  let provider: NodeIdentityProvider;

  let dataAccess: SQLiteDataAccess;

  const container = getContainer(CONTAINER);

  let accessToken: AccessToken;
  let refreshToken: RefreshToken;

  beforeAll(async () => {
    provider = await createTestProvider();

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

  it('POST /oidc/revocation (Access Token)', async () => {
    const requestData: RevocationRequest = { token: accessToken.id, token_type_hint: 'access_token' };
    const requestBody = qs.stringify(requestData);

    const revocationResponse = await agent
      .post('/oidc/revocation')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(requestBody);

    expect(revocationResponse.status).toEqual(HttpResponseStatus.OK);

    await expect(dataAccess.findAccessTokenById(accessToken.id)).resolves.toStrictEqual<AccessToken>(
      expect.objectContaining<Partial<AccessToken>>({ id: accessToken.id, revokedAt: expect.toBeDate() }),
    );

    await expect(dataAccess.findRefreshTokenById(refreshToken.id)).resolves.toStrictEqual<RefreshToken>(
      expect.objectContaining<Partial<RefreshToken>>({ id: refreshToken.id, revokedAt: null }),
    );
  });

  it('POST /oidc/revocation (Refresh Token)', async () => {
    const requestData: RevocationRequest = { token: refreshToken.id, token_type_hint: 'refresh_token' };
    const requestBody = qs.stringify(requestData);

    const revocationResponse = await agent
      .post('/oidc/revocation')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(requestBody);

    expect(revocationResponse.status).toEqual(HttpResponseStatus.OK);

    await expect(dataAccess.findAccessTokenById(accessToken.id)).resolves.toStrictEqual<AccessToken>(
      expect.objectContaining<Partial<AccessToken>>({ id: accessToken.id, revokedAt: expect.toBeDate() }),
    );

    await expect(dataAccess.findRefreshTokenById(refreshToken.id)).resolves.toStrictEqual<RefreshToken>(
      expect.objectContaining<Partial<RefreshToken>>({ id: refreshToken.id, revokedAt: expect.toBeDate() }),
    );
  });
});
