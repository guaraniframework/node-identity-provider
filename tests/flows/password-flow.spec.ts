import http from 'http';
import qs from 'querystring';
import request, { Agent } from 'supertest';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../src/lib/constants';
import { DataAccess } from '../../src/lib/data-access/data-access';
import { SQLiteDataAccess } from '../../src/lib/data-access/sqlite/sqlite.data-access';
import { Client } from '../../src/lib/entities/client';
import { Scope } from '../../src/lib/entities/scope';
import { User } from '../../src/lib/entities/user';
import { NodeIdentityProvider } from '../../src/lib/http/providers/node/node.identity-provider';
import { HttpResponseStatus } from '../../src/lib/http/response/http-response-status.enum';
import { PasswordTokenRequest } from '../../src/lib/requests/token/password/password.token-request';
import { PasswordTokenResponse } from '../../src/lib/responses/token/password/password.token-response';
import { createTestProvider } from '../__fixtures__/create-test-provider';

describe('Resource Owner Password Credentials Flow', () => {
  let provider: NodeIdentityProvider;
  let server: http.Server;
  let agent: Agent;

  let dataAccess: SQLiteDataAccess;

  const container = getContainer(CONTAINER);

  let client: Client;
  let user: User;
  let scopes: Scope[];

  let tokenRequest: PasswordTokenRequest;
  let tokenRequestBody: string;

  beforeAll(async () => {
    provider = await createTestProvider();

    dataAccess = container.resolve(DataAccess) as SQLiteDataAccess;

    server = http.createServer(provider.handle());
    agent = request.agent(server);

    client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
    user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;

    tokenRequest = {
      grant_type: 'password',
      username: 'john.doe@email.com',
      password: 'secretpassword',
      scope: 'foo bar baz qux',
    };

    tokenRequestBody = qs.stringify(tokenRequest);

    scopes = await dataAccess.getScopesByName(tokenRequest.scope!.split(' '));
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
      .send(tokenRequestBody);

    expect(tokenResponse.status).toEqual(HttpResponseStatus.OK);
    expect(tokenResponse.body).toStrictEqual<PasswordTokenResponse>({
      access_token: expect.toBeString(),
      token_type: 'Bearer',
      expires_in: expect.toBeNumber(),
      scope: 'bar baz foo qux',
      refresh_token: expect.toBeString(),
    });

    const accessToken = (await dataAccess.findAccessTokenById(tokenResponse.body.access_token))!;
    const refreshToken = (await dataAccess.findRefreshTokenById(tokenResponse.body.refresh_token))!;

    expect(accessToken.scopes).toStrictEqual<Scope[]>(expect.arrayContaining(scopes));
    expect(accessToken.client!.id).toBe(client.id);
    expect(accessToken.user!.id).toBe(user.id);
    expect(accessToken.login).toBeNull();
    expect(accessToken.refreshToken!.id).toBe(refreshToken.id);

    expect(refreshToken.scopes).toStrictEqual<Scope[]>(expect.arrayContaining(scopes));
    expect(refreshToken.client.id).toBe(client.id);
    expect(refreshToken.user.id).toBe(user.id);
    expect(refreshToken.login).toBeNull();
  });
});
