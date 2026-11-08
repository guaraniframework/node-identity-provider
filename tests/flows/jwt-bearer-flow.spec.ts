import { randomUUID } from 'crypto';
import http from 'http';
import qs from 'querystring';
import request, { Agent } from 'supertest';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import {
  DigitalSignatureAlgorithm,
  JsonWebKey,
  JsonWebSignatureHeaderParameters,
  JsonWebTokenClaimsParameters,
  jwt,
} from '@guarani/jose';

import { CONTAINER } from '../../src/lib/constants';
import { DataAccess } from '../../src/lib/data-access/data-access';
import { SQLiteDataAccess } from '../../src/lib/data-access/sqlite/sqlite.data-access';
import { Client } from '../../src/lib/entities/client';
import { Scope } from '../../src/lib/entities/scope';
import { User } from '../../src/lib/entities/user';
import { NodeIdentityProvider } from '../../src/lib/http/providers/node/node.identity-provider';
import { HttpResponseStatus } from '../../src/lib/http/response/http-response-status.enum';
import { JwtBearerTokenRequest } from '../../src/lib/requests/token/jwt-bearer/jwt-bearer.token-request';
import { JwtBearerTokenResponse } from '../../src/lib/responses/token/jwt-bearer/jwt-bearer.token-response';
import { Settings } from '../../src/lib/settings/settings';
import { getClientJsonWebKey } from '../../src/lib/utils/get-client-jsonwebkey/get-client-jsonwebkey';
import { createTestProvider } from '../__fixtures__/create-test-provider';

describe('JWT Bearer Flow', () => {
  let provider: NodeIdentityProvider;
  let server: http.Server;
  let agent: Agent;

  let settings: Settings;
  let dataAccess: SQLiteDataAccess;

  const container = getContainer(CONTAINER);

  let client: Client;
  let user: User;
  let scopes: Scope[];

  let header: JsonWebSignatureHeaderParameters;
  let claims: JsonWebTokenClaimsParameters;
  let jsonWebKey: JsonWebKey;

  let tokenRequest: JwtBearerTokenRequest;
  let tokenRequestBody: string;

  beforeAll(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-12T00:00:00Z'));

    provider = await createTestProvider();

    settings = container.resolve(Settings);
    dataAccess = container.resolve(DataAccess) as SQLiteDataAccess;

    server = http.createServer(provider.handle());
    agent = request.agent(server);

    client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
    user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;

    claims = {
      iss: client.id,
      sub: user.id,
      aud: new URL(provider.endpoints.find((endpoint) => endpoint.name === 'token')!.path, settings.issuer).href,
      iat: Math.ceil(Date.now() / 1000),
      exp: Math.ceil((Date.now() + 86400000) / 1000),
      jti: randomUUID(),
    };

    jsonWebKey = await getClientJsonWebKey(
      client,
      (jsonWebKey) => jsonWebKey.kid === '24ee80ab-06b8-4934-8fd6-928277d0a777',
    );

    header = { alg: jsonWebKey.parameters.alg as DigitalSignatureAlgorithm, kid: jsonWebKey.parameters.kid! };

    tokenRequest = {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await jwt.signed.serialize(claims, header, { jsonWebKey }),
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
    expect(tokenResponse.body).toStrictEqual<JwtBearerTokenResponse>({
      access_token: expect.toBeString(),
      token_type: 'Bearer',
      expires_in: expect.toBeNumber(),
      scope: 'bar baz foo qux',
    });

    const accessToken = (await dataAccess.findAccessTokenById(tokenResponse.body.access_token))!;

    expect(accessToken.scopes).toStrictEqual<Scope[]>(expect.arrayContaining(scopes));
    expect(accessToken.client!.id).toBe('b1eeace9-2b0c-468e-a444-733befc3b35d');
    expect(accessToken.user!.id).toBe('16907c32-687b-493c-85ba-f41f2c9d4daa');
    expect(accessToken.login).toBeNull();
  });
});
