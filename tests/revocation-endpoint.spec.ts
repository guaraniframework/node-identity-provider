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
import { CodeAuthorizationRequest } from '../src/lib/requests/authorization/code/code.authorization-request';
import { ConsentAcceptDecisionInteractionRequest } from '../src/lib/requests/interaction/decision/consent/consent-accept.decision-interaction-request';
import { LoginAcceptDecisionInteractionRequest } from '../src/lib/requests/interaction/decision/login/login-accept.decision-interaction-request';
import { RevocationRequest } from '../src/lib/requests/revocation/revocation-request';
import { AuthorizationCodeTokenRequest } from '../src/lib/requests/token/authorization-code/authorization-code.token-request';
import { createTestProvider } from './support/create-test-provider';

describe('Authorization and Token Endpoints', () => {
  let server: http.Server;
  let agent: TestAgent;
  let provider: NodeIdentityProvider;

  let dataAccess: SQLiteDataAccess;

  const container = getContainer(CONTAINER);

  let loginChallenge: string;
  let consentChallenge: string;
  let code: string;

  let accessToken: AccessToken;
  let refreshToken: RefreshToken;

  const authorizationRequest: CodeAuthorizationRequest = {
    response_type: 'code',
    client_id: 'b1eeace9-2b0c-468e-a444-733befc3b35d',
    redirect_uri: 'https://client.example.com/oidc/callback',
    scope: 'foo bar baz qux',
    state: '0d45510f-5f1f-4652-be56-ca5641ffa9a9',
    code_challenge: 'qoJXAtQ-gjzfDmoMrHt1a2AFVe1Tn3-HX0VC2_UtezA',
    code_challenge_method: 'S256',
    nonce: '670a5f07-50c8-47b0-bcc8-5a5b121097f1',
  };

  const authorizationRequestQuery = qs.stringify(authorizationRequest);

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

  it('GET /oidc/authorization (Create Session)', async () => {
    const authorizationResponse = await agent.get(`/oidc/authorization?${authorizationRequestQuery}`);
    expect(authorizationResponse.status).toBe(HttpResponseStatus.SeeOther);
  });

  it('GET /oidc/authorization (Redirect to Login Page)', async () => {
    const authorizationResponse = await agent.get(`/oidc/authorization?${authorizationRequestQuery}`);
    const authorizationResponseLocationUrl = new URL(authorizationResponse.headers['location']!);

    expect(authorizationResponse.status).toBe(HttpResponseStatus.SeeOther);

    loginChallenge = authorizationResponseLocationUrl.searchParams.get('login_challenge')!;
  });

  it('POST /oidc/interaction (Login Decision Accept)', async () => {
    const interactionRequest: LoginAcceptDecisionInteractionRequest = {
      interaction_type: 'login',
      login_challenge: loginChallenge,
      decision: 'accept',
      subject_id: 'km5z-aWmXY6Gig4YbFIEdIOVWxc2R1ew03RXaI7QUkGClFewSegH4IsaQuBjnvykiOpClXegrOkZhXErM_hUjg',
    };

    const interactionRequestBody = qs.stringify(interactionRequest);

    const interactionResponse = await agent
      .post('/oidc/interaction')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(interactionRequestBody);

    expect(interactionResponse.status).toBe(HttpResponseStatus.OK);
  });

  it('GET /oidc/authorization (Redirect to Consent Page)', async () => {
    const authorizationResponse = await agent.get(`/oidc/authorization?${authorizationRequestQuery}`);
    const authorizationResponseLocationUrl = new URL(authorizationResponse.headers['location']!);

    expect(authorizationResponse.status).toBe(HttpResponseStatus.SeeOther);

    consentChallenge = authorizationResponseLocationUrl.searchParams.get('consent_challenge')!;
  });

  it('POST /oidc/interaction (Consent Decision Accept)', async () => {
    const interactionRequest: ConsentAcceptDecisionInteractionRequest = {
      interaction_type: 'consent',
      consent_challenge: consentChallenge,
      decision: 'accept',
      granted_scope: 'foo bar baz qux',
    };

    const interactionRequestBody = qs.stringify(interactionRequest);
    const interactionResponse = await agent
      .post('/oidc/interaction')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(interactionRequestBody);

    expect(interactionResponse.status).toBe(HttpResponseStatus.OK);
  });

  it('GET /oidc/authorization (Get Authorization Response)', async () => {
    const authorizationResponse = await agent.get(`/oidc/authorization?${authorizationRequestQuery}`);
    const authorizationResponseLocationUrl = new URL(authorizationResponse.headers['location']!);

    expect(authorizationResponse.status).toBe(HttpResponseStatus.SeeOther);

    const authorizationResponseData = qs.parse(authorizationResponseLocationUrl.search.substring(1));
    code = authorizationResponseData['code'] as string;
  });

  it('POST /oidc/token', async () => {
    const requestData: AuthorizationCodeTokenRequest = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://client.example.com/oidc/callback',
      code_verifier: 'code_challenge',
    };

    const requestBody = qs.stringify(requestData);

    const tokenResponse = await agent
      .post('/oidc/token')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(requestBody);

    expect(tokenResponse.status).toEqual(HttpResponseStatus.OK);

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
      expect.objectContaining<Partial<AccessToken>>({ id: accessToken.id, revokedAt: expect.any(Date) }),
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
      expect.objectContaining<Partial<AccessToken>>({ id: accessToken.id, revokedAt: expect.any(Date) }),
    );

    await expect(dataAccess.findRefreshTokenById(refreshToken.id)).resolves.toStrictEqual<RefreshToken>(
      expect.objectContaining<Partial<RefreshToken>>({ id: refreshToken.id, revokedAt: expect.any(Date) }),
    );
  });
});
