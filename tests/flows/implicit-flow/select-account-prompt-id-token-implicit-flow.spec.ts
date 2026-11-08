import http, { OutgoingHttpHeaders } from 'http';
import qs from 'querystring';
import request, { Agent } from 'supertest';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { JsonWebKeySet, jwe, jwt } from '@guarani/jose';

import { CONTAINER } from '../../../src/lib/constants';
import { DataAccess } from '../../../src/lib/data-access/data-access';
import { SQLiteDataAccess } from '../../../src/lib/data-access/sqlite/sqlite.data-access';
import { Consent } from '../../../src/lib/entities/consent';
import { Grant } from '../../../src/lib/entities/grant';
import { Login } from '../../../src/lib/entities/login';
import { Scope } from '../../../src/lib/entities/scope';
import { Session } from '../../../src/lib/entities/session';
import { NodeIdentityProvider } from '../../../src/lib/http/providers/node/node.identity-provider';
import { HttpResponseStatus } from '../../../src/lib/http/response/http-response-status.enum';
import { InteractionTypeName } from '../../../src/lib/interaction-types/interaction-type-name.type';
import { IdTokenAuthorizationRequest } from '../../../src/lib/requests/authorization/id-token/id-token.authorization-request';
import { ConsentContextInteractionRequest } from '../../../src/lib/requests/interaction/context/consent/consent.context-interaction-request';
import { SelectAccountContextInteractionRequest } from '../../../src/lib/requests/interaction/context/select-account/select-account.context-interaction-request';
import { ConsentAcceptDecisionInteractionRequest } from '../../../src/lib/requests/interaction/decision/consent/consent-accept.decision-interaction-request';
import { SelectAccountDecisionInteractionRequest } from '../../../src/lib/requests/interaction/decision/select-account/select-account.decision-interaction-request';
import { IdTokenAuthorizationResponse } from '../../../src/lib/responses/authorization/id-token/id-token.authorization-response';
import { ConsentContextInteractionResponse } from '../../../src/lib/responses/interaction/context/consent/consent.context-interaction-response';
import { SelectAccountContextInteractionResponse } from '../../../src/lib/responses/interaction/context/select-account/select-account.context-interaction-response';
import { ConsentDecisionInteractionResponse } from '../../../src/lib/responses/interaction/decision/consent/consent.decision-interaction-response';
import { SelectAccountDecisionInteractionResponse } from '../../../src/lib/responses/interaction/decision/select-account/select-account.decision-interaction-response';
import { Settings } from '../../../src/lib/settings/settings';
import { addParametersToUrl } from '../../../src/lib/utils/add-parameters-to-url/add-parameters-to-url';
import { getClientJsonWebKey } from '../../../src/lib/utils/get-client-jsonwebkey/get-client-jsonwebkey';
import { createTestProvider } from '../../__fixtures__/create-test-provider';

describe('Select Account Prompt ID Token Implicit Flow', () => {
  let provider: NodeIdentityProvider;
  let server: http.Server;
  let agent: Agent;

  let jsonWebKeySet: JsonWebKeySet;
  let dataAccess: SQLiteDataAccess;
  let settings: Settings;

  const container = getContainer(CONTAINER);

  let authorizationRequestUrl: URL;

  let sessionId: string;
  let loginChallenge: string;
  let consentChallenge: string;

  let session: Session;
  let grant: Grant;
  let login1: Login;
  let login2: Login;
  let consent: Consent;

  const authorizationRequest: IdTokenAuthorizationRequest = {
    response_type: 'id_token',
    client_id: 'b1eeace9-2b0c-468e-a444-733befc3b35d',
    redirect_uri: 'https://client.example.com/oidc/callback',
    scope: 'openid foo bar baz qux',
    state: '0d45510f-5f1f-4652-be56-ca5641ffa9a9',
    nonce: '670a5f07-50c8-47b0-bcc8-5a5b121097f1',
    prompt: 'select_account',
  };

  const authorizationRequestQuery = qs.stringify(authorizationRequest);

  beforeAll(async () => {
    provider = await createTestProvider();

    jsonWebKeySet = container.resolve(JsonWebKeySet);
    dataAccess = container.resolve(DataAccess) as SQLiteDataAccess;
    settings = container.resolve(Settings);

    server = http.createServer(provider.handle());
    agent = request.agent(server);

    const user1 = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;
    const user2 = (await dataAccess.findUserById('5abe9a9c-c868-4f12-8c76-f34dec7e1cc0'))!;
    const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;

    session = await dataAccess.createSession();

    login1 = await dataAccess.createLogin(user1, client, session, [], null);
    login2 = await dataAccess.createLogin(user2, client, session, [], null);

    await dataAccess.inactivateSessionActiveLogin(session);
    session = (await dataAccess.findSessionById(session.id))!;
  });

  beforeEach(() => {
    authorizationRequestUrl = addParametersToUrl(
      new URL('/oidc/authorization', settings.issuer!),
      authorizationRequest,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await dataAccess.down();
    container.clear();
  });

  it('GET /oidc/authorization (Redirect to Select Account Page)', async () => {
    const authorizationResponse = await agent
      .get(`/oidc/authorization?${authorizationRequestQuery}`)
      .set('Cookie', `${settings.sessionCookie}=${session.id}`);

    const authorizationResponseLocationUrl = new URL(authorizationResponse.headers['location']!);

    expect(authorizationResponse.status).toBe(HttpResponseStatus.SeeOther);

    sessionId = session.id;
    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeNull();
    expect(session.logins.map((login) => login.id)).toStrictEqual<string[]>(
      expect.arrayContaining([login1.id, login2.id]),
    );

    loginChallenge = authorizationResponseLocationUrl.searchParams.get('login_challenge')!;
    expect(loginChallenge).toBeString();

    expect(session.grant).toBeInstanceOf(Grant);
    expect(session.grant!.loginChallenge).toBe(loginChallenge);
    expect(session.grant!.interactions).toBeEmpty();

    grant = session.grant!;
  });

  it('GET /oidc/interaction (Get Select Account Interaction Type Context)', async () => {
    const interactionRequest: SelectAccountContextInteractionRequest = {
      interaction_type: 'select_account',
      client_id: 'b1eeace9-2b0c-468e-a444-733befc3b35d',
      login_challenge: loginChallenge,
    };

    const interactionRequestQuery = qs.stringify(interactionRequest);
    const interactionResponse = await agent.get(`/oidc/interaction?${interactionRequestQuery}`);

    expect(interactionResponse.status).toBe(HttpResponseStatus.OK);
    expect(interactionResponse.body).toStrictEqual<SelectAccountContextInteractionResponse>({
      skip: false,
      request_url: authorizationRequestUrl.href,
      logins_ids: session.logins.map((login) => login.id),
      context: { prompts: ['select_account'] },
    });

    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeNull();
    expect(session.logins.map((login) => login.id)).toStrictEqual<string[]>(
      expect.arrayContaining([login1.id, login2.id]),
    );

    expect(session.grant).toBeInstanceOf(Grant);
    expect(session.grant!.id).toBe(grant.id);
    expect(session.grant!.interactions).toBeEmpty();
  });

  it('POST /oidc/interaction (Select Account Decision)', async () => {
    const interactionRequest: SelectAccountDecisionInteractionRequest = {
      interaction_type: 'select_account',
      login_challenge: loginChallenge,
      login_id: login1.id,
    };

    const interactionRequestBody = qs.stringify(interactionRequest);

    const interactionResponse = await agent
      .post('/oidc/interaction')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(interactionRequestBody);

    expect(interactionResponse.status).toBe(HttpResponseStatus.OK);

    expect(interactionResponse.headers).toMatchObject<OutgoingHttpHeaders>({
      'cache-control': 'no-store',
      pragma: 'no-cache',
    });

    expect(interactionResponse.body).toStrictEqual<SelectAccountDecisionInteractionResponse>({
      redirect_to: authorizationRequestUrl.href,
    });

    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin!.id).toBe(login1.id);
    expect(session.logins.map((login) => login.id)).toStrictEqual<string[]>(
      expect.arrayContaining([login1.id, login2.id]),
    );

    expect(session.grant).toBeInstanceOf(Grant);
    expect(session.grant!.id).toBe(grant.id);
    expect(session.grant!.interactions).toStrictEqual<InteractionTypeName[]>(['select_account']);
  });

  it('GET /oidc/authorization (Redirect to Consent Page)', async () => {
    const authorizationResponse = await agent
      .get(`/oidc/authorization?${authorizationRequestQuery}`)
      .set('Cookie', `${settings.sessionCookie}=${session.id}`);

    const authorizationResponseLocationUrl = new URL(authorizationResponse.headers['location']!);

    expect(authorizationResponse.status).toBe(HttpResponseStatus.SeeOther);

    consentChallenge = authorizationResponseLocationUrl.searchParams.get('consent_challenge')!;
    expect(consentChallenge).toBeString();

    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeInstanceOf(Login);
    expect(session.activeLogin!.id).toBe(login1.id);

    expect(session.logins.map((login) => login.id)).toStrictEqual<string[]>(
      expect.arrayContaining([login1.id, login2.id]),
    );

    expect(session.grant).toBeInstanceOf(Grant);
    expect(session.grant!.id).toBe(grant.id);
    expect(session.grant!.consentChallenge).toBe(consentChallenge);
    expect(session.grant!.interactions).toStrictEqual<InteractionTypeName[]>(['select_account']);
  });

  it('GET /oidc/interaction (Get Consent Interaction Type Context)', async () => {
    const interactionRequest: ConsentContextInteractionRequest = {
      interaction_type: 'consent',
      client_id: 'b1eeace9-2b0c-468e-a444-733befc3b35d',
      consent_challenge: consentChallenge,
    };

    const interactionRequestQuery = qs.stringify(interactionRequest);
    const interactionResponse = await agent.get(`/oidc/interaction?${interactionRequestQuery}`);

    expect(interactionResponse.status).toBe(HttpResponseStatus.OK);
    expect(interactionResponse.body).toStrictEqual<ConsentContextInteractionResponse>({
      skip: false,
      request_url: authorizationRequestUrl.href,
      requested_scopes: ['openid', 'foo', 'bar', 'baz', 'qux'],
      subject_id: expect.toBeString(),
      context: { prompts: ['select_account'] },
    });

    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeInstanceOf(Login);
    expect(session.activeLogin!.id).toBe(login1.id);

    expect(session.logins.map((login) => login.id)).toStrictEqual<string[]>(
      expect.arrayContaining([login1.id, login2.id]),
    );

    expect(session.grant).toBeInstanceOf(Grant);
    expect(session.grant!.id).toBe(grant.id);
    expect(session.grant!.consentChallenge).toBe(consentChallenge);
    expect(session.grant!.interactions).toStrictEqual<InteractionTypeName[]>(['select_account']);
  });

  it('POST /oidc/interaction (Consent Accept Decision)', async () => {
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

    expect(interactionResponse.headers).toMatchObject<OutgoingHttpHeaders>({
      'cache-control': 'no-store',
      pragma: 'no-cache',
    });

    expect(interactionResponse.body).toStrictEqual<ConsentDecisionInteractionResponse>({
      redirect_to: authorizationRequestUrl.href,
    });

    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeInstanceOf(Login);
    expect(session.activeLogin!.id).toBe(login1.id);

    expect(session.logins.map((login) => login.id)).toStrictEqual<string[]>(
      expect.arrayContaining([login1.id, login2.id]),
    );

    expect(session.grant).toBeInstanceOf(Grant);
    expect(session.grant!.id).toBe(grant.id);
    expect(session.grant!.interactions).toStrictEqual<InteractionTypeName[]>(['select_account', 'consent']);
    expect(session.grant!.consent).toBeInstanceOf(Consent);

    consent = session.grant!.consent!;
  });

  it('GET /oidc/authorization (Get Authorization Response)', async () => {
    const authorizationResponse = await agent
      .get(`/oidc/authorization?${authorizationRequestQuery}`)
      .set('Cookie', `${settings.sessionCookie}=${session.id}`);

    const authorizationResponseLocationUrl = new URL(authorizationResponse.headers['location']!);

    expect(authorizationResponse.status).toBe(HttpResponseStatus.SeeOther);

    const authorizationResponseData = qs.parse(authorizationResponseLocationUrl.hash.substring(1));

    expect(authorizationResponseData).toStrictEqual<IdTokenAuthorizationResponse>(
      expect.objectContaining<IdTokenAuthorizationResponse>({
        id_token: expect.toBeString(),
        state: '0d45510f-5f1f-4652-be56-ca5641ffa9a9',
      }),
    );

    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeInstanceOf(Login);
    expect(session.activeLogin!.id).toBe(login1.id);
    expect(session.logins.map((login) => login.id)).toStrictEqual<string[]>(
      expect.arrayContaining([login1.id, login2.id]),
    );

    expect(session.grant).toBeNull();

    await expect(dataAccess.findConsentByClientAndUser(consent.client, consent.user)).resolves.toStrictEqual<Consent>(
      expect.objectContaining<Consent>({ ...consent, scopes: expect.arrayContaining<Scope>(consent.scopes) }),
    );

    const idToken = authorizationResponseData['id_token'] as string;

    const { plaintext } = await jwe.compact.deserialize(idToken, {
      expectedContentEncryptionAlgorithms: ['A128GCM'],
      expectedKeyManagementAlgorithms: ['RSA-OAEP'],
      jsonWebKey: await getClientJsonWebKey(
        consent.client,
        (jsonWebKey) => jsonWebKey.kid === 'd2e9019d-0043-48e0-bc02-98c781e88798',
      ),
    });

    const {
      claims: { parameters: claims },
    } = await jwt.signed.deserialize(plaintext.toString('ascii'), {
      expectedDigitalSignatureAlgorithms: ['RS256'],
      jsonWebKey: jsonWebKeySet.get((jsonWebKey) => jsonWebKey.kid === '03bf969a-e23b-42f7-8955-199e52faa09f'),
    });

    expect(claims.iss).toBe(settings.issuer.href);
    expect(claims.sub).toBe('km5z-aWmXY6Gig4YbFIEdIOVWxc2R1ew03RXaI7QUkGClFewSegH4IsaQuBjnvykiOpClXegrOkZhXErM_hUjg');
    expect(claims.aud).toStrictEqual(['b1eeace9-2b0c-468e-a444-733befc3b35d']);
    expect(claims['nonce']).toBe('670a5f07-50c8-47b0-bcc8-5a5b121097f1');
  });
});
