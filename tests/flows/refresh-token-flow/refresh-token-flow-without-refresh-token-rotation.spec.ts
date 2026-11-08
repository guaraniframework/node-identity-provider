import http from 'http';
import qs from 'querystring';
import request, { Agent } from 'supertest';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../../src/lib/constants';
import { DataAccess } from '../../../src/lib/data-access/data-access';
import { SQLiteDataAccess } from '../../../src/lib/data-access/sqlite/sqlite.data-access';
import { AccessToken } from '../../../src/lib/entities/access-token';
import { Client } from '../../../src/lib/entities/client';
import { RefreshToken } from '../../../src/lib/entities/refresh-token';
import { Scope } from '../../../src/lib/entities/scope';
import { User } from '../../../src/lib/entities/user';
import { NodeIdentityProvider } from '../../../src/lib/http/providers/node/node.identity-provider';
import { HttpResponseStatus } from '../../../src/lib/http/response/http-response-status.enum';
import { PasswordTokenRequest } from '../../../src/lib/requests/token/password/password.token-request';
import { RefreshTokenTokenRequest } from '../../../src/lib/requests/token/refresh-token/refresh-token.token-request';
import { PasswordTokenResponse } from '../../../src/lib/responses/token/password/password.token-response';
import { Settings } from '../../../src/lib/settings/settings';
import { createTestProvider } from '../../__fixtures__/create-test-provider';

describe('Refresh Token Flow without Refresh Token Rotation', () => {
  let provider: NodeIdentityProvider;
  let server: http.Server;
  let agent: Agent;

  let settings: Settings;
  let dataAccess: SQLiteDataAccess;

  const container = getContainer(CONTAINER);

  let client: Client;
  let user: User;
  let scopes: Scope[];
  let accessToken1: AccessToken;
  let accessToken2: AccessToken;
  let refreshToken1: RefreshToken;
  let refreshToken2: RefreshToken;

  const passwordTokenRequest: PasswordTokenRequest = {
    grant_type: 'password',
    username: 'john.doe@email.com',
    password: 'secretpassword',
    scope: 'foo bar baz qux',
  };

  const passwordTokenRequestBody = qs.stringify(passwordTokenRequest);

  beforeAll(async () => {
    provider = await createTestProvider();

    settings = container.resolve(Settings);
    dataAccess = container.resolve(DataAccess) as SQLiteDataAccess;

    Reflect.set(settings, 'enableRefreshTokenRotation', false);

    server = http.createServer(provider.handle());
    agent = request.agent(server);

    client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
    user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;
    scopes = await dataAccess.getScopesByName(passwordTokenRequest.scope!.split(' '));
  });

  afterAll(async () => {
    await dataAccess.down();
    container.clear();

    jest.useRealTimers();
  });

  it('POST /oidc/token (Get Access Token)', async () => {
    const tokenResponse = await agent
      .post('/oidc/token')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(passwordTokenRequestBody);

    expect(tokenResponse.status).toEqual(HttpResponseStatus.OK);
    expect(tokenResponse.body).toStrictEqual<PasswordTokenResponse>({
      access_token: expect.toBeString(),
      token_type: 'Bearer',
      expires_in: expect.toBeNumber(),
      scope: 'bar baz foo qux',
      refresh_token: expect.toBeString(),
    });

    accessToken1 = (await dataAccess.findAccessTokenById(tokenResponse.body.access_token))!;
    refreshToken1 = (await dataAccess.findRefreshTokenById(tokenResponse.body.refresh_token))!;

    expect(accessToken1.scopes).toStrictEqual<Scope[]>(expect.arrayContaining(scopes));
    expect(accessToken1.client!.id).toBe(client.id);
    expect(accessToken1.user!.id).toBe(user.id);
    expect(accessToken1.login).toBeNull();
    expect(accessToken1.refreshToken!.id).toBe(refreshToken1.id);
    expect(accessToken1.revokedAt).toBeNull();

    expect(refreshToken1.scopes).toStrictEqual<Scope[]>(expect.arrayContaining(scopes));
    expect(refreshToken1.client.id).toBe(client.id);
    expect(refreshToken1.user.id).toBe(user.id);
    expect(refreshToken1.login).toBeNull();
    expect(refreshToken1.revokedAt).toBeNull();
  });

  it('POST /oidc/token (Refresh Access Token)', async () => {
    const refreshTokenTokenRequest: RefreshTokenTokenRequest = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken1.id,
      scope: 'foo bar baz qux',
    };

    const refreshTokenTokenRequestBody = qs.stringify(refreshTokenTokenRequest);

    const tokenResponse = await agent
      .post('/oidc/token')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(refreshTokenTokenRequestBody);

    expect(tokenResponse.status).toEqual(HttpResponseStatus.OK);
    expect(tokenResponse.body).toStrictEqual<PasswordTokenResponse>({
      access_token: expect.toBeString(),
      token_type: 'Bearer',
      expires_in: expect.toBeNumber(),
      scope: 'bar baz foo qux',
      refresh_token: expect.toBeString(),
    });

    accessToken2 = (await dataAccess.findAccessTokenById(tokenResponse.body.access_token))!;
    refreshToken2 = (await dataAccess.findRefreshTokenById(tokenResponse.body.refresh_token))!;

    expect(accessToken2.id).not.toBe(accessToken1.id);
    expect(refreshToken2.id).toBe(refreshToken1.id);

    expect(accessToken2.scopes).toStrictEqual<Scope[]>(expect.arrayContaining(scopes));
    expect(accessToken2.client!.id).toBe(client.id);
    expect(accessToken2.user!.id).toBe(user.id);
    expect(accessToken2.login).toBeNull();
    expect(accessToken2.refreshToken!.id).toBe(refreshToken2.id);
    expect(accessToken2.revokedAt).toBeNull();

    expect(refreshToken2.scopes).toStrictEqual<Scope[]>(expect.arrayContaining(scopes));
    expect(refreshToken2.client.id).toBe(client.id);
    expect(refreshToken2.user.id).toBe(user.id);
    expect(refreshToken2.login).toBeNull();
    expect(refreshToken2.revokedAt).toBeNull();

    accessToken1 = (await dataAccess.findAccessTokenById(accessToken1.id))!;
    refreshToken1 = (await dataAccess.findRefreshTokenById(refreshToken1.id))!;

    expect(accessToken1.revokedAt).toBeNull();
    expect(refreshToken1.revokedAt).toBeNull();
  });
});
