import http from 'http';
import qs from 'querystring';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { setTimeout } from 'timers/promises';

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
import { RefreshTokenTokenRequest } from '../../src/lib/requests/token/refresh-token/refresh-token.token-request';
import { Settings } from '../../src/lib/settings/settings';
import { createTestProvider } from '../__fixtures__/create-test-provider';

describe('Revocation Endpoint with Cascade Revocation', () => {
  let server: http.Server;
  let agent: TestAgent;
  let provider: NodeIdentityProvider;

  let settings: Settings;
  let dataAccess: SQLiteDataAccess;

  const container = getContainer(CONTAINER);

  let accessToken1: AccessToken;
  let accessToken2: AccessToken;
  let refreshToken: RefreshToken;

  beforeAll(async () => {
    provider = await createTestProvider();

    settings = container.resolve(Settings);
    dataAccess = container.resolve(DataAccess) as SQLiteDataAccess;

    Reflect.set(settings, 'enableRefreshTokenRotation', false);

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

  it('POST /oidc/token (Get and Refresh Access Token)', async () => {
    const passwordTokenRequest: PasswordTokenRequest = {
      grant_type: 'password',
      username: 'john.doe@email.com',
      password: 'secretpassword',
      scope: 'foo bar baz qux',
    };

    const passwordTokenRequestBody = qs.stringify(passwordTokenRequest);

    const passwordTokenResponse = await agent
      .post('/oidc/token')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(passwordTokenRequestBody);

    accessToken1 = (await dataAccess.findAccessTokenById(passwordTokenResponse.body.access_token))!;
    refreshToken = (await dataAccess.findRefreshTokenById(passwordTokenResponse.body.refresh_token))!;

    expect(accessToken1.revokedAt).toBeNull();
    expect(refreshToken.revokedAt).toBeNull();

    const refreshTokenTokenRequest: RefreshTokenTokenRequest = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken.id,
      scope: 'foo bar baz qux',
    };

    const refreshTokenTokenRequestBody = qs.stringify(refreshTokenTokenRequest);

    const refreshTokenTokenResponse = await agent
      .post('/oidc/token')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(refreshTokenTokenRequestBody);

    accessToken2 = (await dataAccess.findAccessTokenById(refreshTokenTokenResponse.body.access_token))!;
    expect(accessToken2.id).not.toBe(accessToken1.id);

    await expect(
      dataAccess.findRefreshTokenById(refreshTokenTokenResponse.body.refresh_token),
    ).resolves.toStrictEqual<RefreshToken>(expect.objectContaining<Partial<RefreshToken>>({ id: refreshToken.id }));

    expect(accessToken1.revokedAt).toBeNull();
    expect(accessToken2.revokedAt).toBeNull();
    expect(refreshToken.revokedAt).toBeNull();
  });

  it('POST /oidc/revocation (Access Token without Cascade)', async () => {
    const requestData: RevocationRequest = { token: accessToken1.id, token_type_hint: 'access_token' };
    const requestBody = qs.stringify(requestData);

    const revocationResponse = await agent
      .post('/oidc/revocation')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(requestBody);

    expect(revocationResponse.status).toEqual(HttpResponseStatus.OK);

    await expect(dataAccess.findAccessTokenById(accessToken1.id)).resolves.toStrictEqual<AccessToken>(
      expect.objectContaining<Partial<AccessToken>>({ id: accessToken1.id, revokedAt: expect.toBeDate() }),
    );

    await expect(dataAccess.findAccessTokenById(accessToken2.id)).resolves.toStrictEqual<AccessToken>(
      expect.objectContaining<Partial<AccessToken>>({ id: accessToken2.id, revokedAt: null }),
    );

    await expect(dataAccess.findRefreshTokenById(refreshToken.id)).resolves.toStrictEqual<RefreshToken>(
      expect.objectContaining<Partial<RefreshToken>>({ id: refreshToken.id, revokedAt: null }),
    );

    // The execution is too efficient, so we need to throttle it.
    await setTimeout(1000);
  });

  it('POST /oidc/revocation (Refresh Token with Cascade)', async () => {
    const requestData: RevocationRequest = { token: refreshToken.id, token_type_hint: 'refresh_token' };
    const requestBody = qs.stringify(requestData);

    const revocationResponse = await agent
      .post('/oidc/revocation')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(requestBody);

    expect(revocationResponse.status).toEqual(HttpResponseStatus.OK);

    await expect(dataAccess.findAccessTokenById(accessToken1.id)).resolves.toStrictEqual<AccessToken>(
      expect.objectContaining<Partial<AccessToken>>({ id: accessToken1.id, revokedAt: expect.toBeDate() }),
    );

    await expect(dataAccess.findAccessTokenById(accessToken2.id)).resolves.toStrictEqual<AccessToken>(
      expect.objectContaining<Partial<AccessToken>>({ id: accessToken2.id, revokedAt: expect.toBeDate() }),
    );

    await expect(dataAccess.findRefreshTokenById(refreshToken.id)).resolves.toStrictEqual<RefreshToken>(
      expect.objectContaining<Partial<RefreshToken>>({ id: refreshToken.id, revokedAt: expect.toBeDate() }),
    );

    accessToken1 = (await dataAccess.findAccessTokenById(accessToken1.id))!;
    accessToken2 = (await dataAccess.findAccessTokenById(accessToken2.id))!;

    expect(accessToken1.revokedAt).not.toStrictEqual(accessToken2.revokedAt);
  });
});
